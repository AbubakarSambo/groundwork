import { BoardService } from './board.service';
import { ReportsService } from '../reports/reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { whenTheBoardLastChanged, whatAReaderWhoOnlyReadsIsTold } from './when-the-board-last-changed';

/**
 * U.10: THE BOARD, AS THE LEAD, A PARTICIPANT AND AN ADMIN READ IT.
 *
 * A real board is assembled through `BoardService.get`, with the report's real name resolution,
 * and the test reads what each person is served:
 *  - when it last changed, taken from the record, the same for everybody;
 *  - the read-only note, only for an admin who neither runs the check-in nor takes part;
 *  - what a target assumes, only to whoever may read the target;
 *  - never how a person's answers were rated, not even to the lead;
 *  - and opening it rebuilds nothing: no write to the record, no report written, and the model
 *    is not asked for anything.
 */

const LEAD = {
  id: 'p-lead', userId: 'u-wairimu', partyType: PartyType.INITIATOR, email: 'w@baridi.test',
  roleAsDescribed: 'runs the sales team', nameGiven: null, organisationGiven: null, managingOnly: true,
  createdAt: new Date('2026-09-01T09:00:00Z'), user: { firstName: 'Wairimu', lastName: 'Kamau' },
};
const MIRIAM = {
  id: 'p-miriam', userId: 'u-miriam', partyType: PartyType.PARTICIPANT, email: 'm@baridi.test',
  roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null, managingOnly: false,
  createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: 'Miriam', lastName: 'Wanjiku' },
};
const AISHA = {
  id: 'p-aisha', userId: 'u-aisha', partyType: PartyType.PARTICIPANT, email: 'a@baridi.test',
  roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null, managingOnly: false,
  createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: 'Aisha', lastName: 'Otieno' },
};

const CHECK_INS = [
  /* Miriam's answers were rated "vague". The lead must never be able to read that. */
  { id: 'c1', participantId: 'p-miriam', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: new Date('2026-09-22T16:10:00Z'), specificityLevel: 'vague', specificityDimensions: { checkable: 'vague' } },
  { id: 'c2', participantId: 'p-aisha', sessionNumber: 1, status: 'COMPLETED', isSetup: false, completedAt: new Date('2026-09-23T15:00:00Z'), specificityLevel: 'specific', specificityDimensions: { checkable: 'specific' } },
];

const GROUND: any = {
  id: 'g-sales', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED,
  initiatorId: 'u-wairimu', createdByUserId: 'u-wairimu', organizationId: 'org-1',
  peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'WEEKLY',
  whoSeesTargets: 'THEIR_OWN', label: 'Sales team, Q3',
  participants: [LEAD, MIRIAM, AISHA],
  checkIns: CHECK_INS,
  report: {
    releasedAt: new Date('2026-09-23T17:00:00Z'), sharedAs: null, theOpening: null, networkPicture: null,
    sharedPicture: 'Both have checked in.', agreements: [],
    divergences: [{ topic: 'Whether a price range counts as a budget', positions: [
      { participantLabel: 'Participant A', view: 'A range is a budget.' },
      { participantLabel: 'Participant Z', view: 'Only a figure is a budget.' },
    ] }], centralQuestion: null,
    engagement: {}, findings: [],
    createdAt: new Date('2026-09-20T09:00:00Z'), updatedAt: new Date('2026-09-23T15:02:00Z'),
  },
  objectives: [
    { id: 'o-team', name: 'Sales', target: 25, count: 21, prevCount: 20, ownerParticipantId: null, sortOrder: 0,
      assumes: ['6 reps each close about 4 sales.', 'Stock arrives within a week of an order.'],
      createdAt: new Date('2026-09-01T09:00:00Z'), updatedAt: new Date('2026-09-10T09:00:00Z') },
    { id: 'o-aisha', name: 'Aisha’s sales', target: 5, count: 4, prevCount: 4, ownerParticipantId: 'p-aisha', sortOrder: 1,
      assumes: ['Aisha keeps her two supermarket buyers.'],
      createdAt: new Date('2026-09-01T09:00:00Z'), updatedAt: new Date('2026-09-02T09:00:00Z') },
  ],
  dependencies: [],
  poll: null,
};

const WRITES = ['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany'];

function boardFor(requestingUserId: string, viewerRole = 'MEMBER', opts: { mayWordNewLines?: boolean } = {}) {
  const writes: string[] = [];
  const reads = {
    findMany: jest.fn(async () => []),
    findFirst: jest.fn(async () => null),
    findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0),
    aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })),
  };
  const model = (name: string, own: Record<string, any> = {}) => new Proxy({ ...reads, ...own }, {
    get(target: any, prop: string) {
      if (WRITES.includes(prop)) return jest.fn(async () => { writes.push(`${name}.${prop}`); return {}; });
      return target[prop];
    },
  });
  const prisma: any = new Proxy({
    ground: model('ground', { findUnique: jest.fn(async () => JSON.parse(JSON.stringify(GROUND))) }),
    user: model('user', { findUnique: jest.fn(async () => ({ role: viewerRole, organizationId: 'org-1' })) }),
    checkIn: model('checkIn', { findMany: jest.fn(async () => JSON.parse(JSON.stringify(CHECK_INS))) }),
    groundDocument: model('groundDocument', {
      findMany: jest.fn(async () => [{ createdAt: new Date('2026-09-21T09:00:00Z') }]),
    }),
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model(prop);
      return target[prop];
    },
  });
  const respond = jest.fn(async () => null);
  const reports = Object.create(ReportsService.prototype) as ReportsService;
  const svc = new BoardService(prisma, { respond } as any, { getSessionProgress: async () => null } as any, reports);
  return { board: svc.get('g-sales', requestingUserId, undefined, opts) as Promise<any>, writes, respond, prisma };
}

describe('when the board last changed, for every reader', () => {
  it('is the newest thing in the record, the same for the lead, a participant and an admin', async () => {
    for (const [who, role] of [['u-wairimu', 'MEMBER'], ['u-miriam', 'MEMBER'], ['u-grace', 'ADMIN']] as const) {
      const { board } = boardFor(who, role);
      /* The report was rewritten at 15:02, after Aisha's check-in at 15:00: that is the newest thing. */
      expect((await board).lastChangedAt).toBe('2026-09-23T15:02:00.000Z');
    }
  });

  it('counts a finished check-in, the report, a target, a handoff and a shared document', () => {
    expect(whenTheBoardLastChanged({ checkIns: [{ completedAt: '2026-09-24T10:00:00Z' }], report: { updatedAt: '2026-09-23T10:00:00Z' } })).toBe('2026-09-24T10:00:00.000Z');
    expect(whenTheBoardLastChanged({ objectives: [{ updatedAt: '2026-09-25T10:00:00Z' }] })).toBe('2026-09-25T10:00:00.000Z');
    expect(whenTheBoardLastChanged({ dependencies: [{ updatedAt: '2026-09-26T10:00:00Z' }] })).toBe('2026-09-26T10:00:00.000Z');
    expect(whenTheBoardLastChanged({ documentsEveryoneMayRead: [{ createdAt: '2026-09-27T10:00:00Z' }] })).toBe('2026-09-27T10:00:00.000Z');
    expect(whenTheBoardLastChanged({})).toBeNull();
  });

  it('asks only for documents everyone in the check-in may read', async () => {
    /* A private document's time would tell the others that somebody added something they cannot see. */
    const { board, prisma } = boardFor('u-miriam');
    await board;
    const asked = (prisma.groundDocument.findMany as jest.Mock).mock.calls.map((c: any[]) => c[0]?.where);
    expect(asked).toContainEqual({ groundId: 'g-sales', visibility: 'OPEN' });
  });
});

describe('opening the board rebuilds nothing', () => {
  it('writes nothing to the record, writes no report, and asks the model for nothing', async () => {
    for (const who of ['u-wairimu', 'u-miriam']) {
      const { board, writes, respond } = boardFor(who);
      await board;
      expect(writes).toEqual([]);
      expect(respond).not.toHaveBeenCalled();
    }
  });

  it('but the warm-up when a check-in comes in may still word the lines, so they are ready', async () => {
    const { board, respond } = boardFor('u-wairimu', 'MEMBER', { mayWordNewLines: true });
    await board;
    expect(respond).toHaveBeenCalled();
  });

  it('and does not reach for the report writer at all', async () => {
    const spies = Object.getOwnPropertyNames(ReportsService.prototype)
      .filter((k) => /generate|synthes|rebuild|regenerate|refresh/i.test(k))
      .map((k) => jest.spyOn(ReportsService.prototype as any, k).mockImplementation(async () => null));
    const { board } = boardFor('u-wairimu');
    await board;
    for (const s of spies) expect(s).not.toHaveBeenCalled();
    spies.forEach((s) => s.mockRestore());
  });
});

describe('the read-only note', () => {
  it('an admin who neither runs nor takes part reads who runs it', async () => {
    const { board } = boardFor('u-grace', 'ADMIN');
    expect((await board).readOnlyNote).toBe('You can read this check-in’s board and reports. Wairimu Kamau runs it.');
  });

  it('the lead and a participant read no note', async () => {
    expect((await boardFor('u-wairimu').board).readOnlyNote).toBeNull();
    expect((await boardFor('u-miriam').board).readOnlyNote).toBeNull();
  });

  it('says only the first sentence when nobody can be named', () => {
    expect(whatAReaderWhoOnlyReadsIsTold({ runsIt: false, takesPart: false, mayRead: true }, null))
      .toBe('You can read this check-in’s board and reports.');
  });
});

describe('what a target assumes', () => {
  it('the lead reads what every target assumes', async () => {
    const b = await boardFor('u-wairimu').board;
    /* Each name is a full sentence about whoever holds it since 1 October; "Sales" and "Aisha’s sales" were not. */
    const byName = Object.fromEntries((b.objectives ?? []).map((o: any) => [o.name, o.assumes]));
    expect(byName['The team is aiming for 25 sales.']).toEqual(['6 reps each close about 4 sales.', 'Stock arrives within a week of an order.']);
    expect(byName['Aisha Otieno is aiming for 5 sales.']).toEqual(['Aisha keeps her two supermarket buyers.']);
  });

  it('Miriam reads the team target’s, and nothing about Aisha’s number', async () => {
    const b = await boardFor('u-miriam').board;
    expect((b.objectives ?? []).map((o: any) => o.name)).toEqual(['The team is aiming for 25 sales.']);
    expect(JSON.stringify(b)).not.toContain('supermarket buyers');
  });
});

/*
 * CHANGED 28 September 2026, on Hafsah's correction: the rating of how checkable a person's answers
 * are is needed, and the prototype shows "Nothing checkable" on the lead's board. These pinned the
 * opposite (a1747927). What still holds: no raw rating value reaches the board, and a participant is
 * never served the rows at all.
 */
describe('the lead reads "nothing checkable" as the prototype shows it, and nothing more of the rating', () => {
  it('the lead’s board says "nothing checkable" where the answers could not be checked, and never the rating itself', async () => {
    const b = await boardFor('u-wairimu').board;
    const rows = b.eachPerson ?? [];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.map((r: any) => r.reason)).toContain('nothing checkable');
    const served = JSON.stringify(b);
    expect(served).not.toMatch(/specificity|vague/i);
  });

  it('and a participant is never served the rows', async () => {
    const b = await boardFor('u-miriam').board;
    expect(b.eachPerson ?? []).toEqual([]);
  });

  it('Miriam, whose answers could not be checked, and Aisha, whose could, are told apart as the prototype does', async () => {
    const rows = (await boardFor('u-wairimu').board).eachPerson ?? [];
    expect(rows.map((r: any) => `${r.who} ${r.reason}`)).toEqual([
      'Miriam Wanjiku nothing checkable', 'Aisha Otieno nothing to do',
    ]);
  });
});

describe('where people see it differently names each side, never with an internal label', () => {
  it('every side carries who to print, and no reader is served "Participant" or "the initiator" there', async () => {
    let seen = 0;
    for (const [who, role] of [['u-wairimu', 'MEMBER'], ['u-miriam', 'MEMBER'], ['u-grace', 'ADMIN']] as const) {
      const b = await boardFor(who, role).board;
      const sides = (b.divergence?.items ?? []).flatMap((d: any) => d.positions ?? []);
      seen += sides.length;
      for (const s of sides) {
        expect(typeof s.who).toBe('string');
        expect(s.who).not.toMatch(/participant [a-z0-9]+|initiator/i);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});
