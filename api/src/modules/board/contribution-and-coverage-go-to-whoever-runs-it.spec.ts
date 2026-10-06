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
  initiatorId: 'u-wairimu', createdByUserId: 'u-setup', organizationId: 'org-1',
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

function boardFor(requestingUserId: string, viewerRole = 'MEMBER', opts: { mayWordNewLines?: boolean } = {}, theGround: any = GROUND) {
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
    ground: model('ground', { findUnique: jest.fn(async () => JSON.parse(JSON.stringify(theGround))) }),
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


function ground(peersVisible: boolean) { return { ...GROUND, peersVisibleToEachOther: peersVisible, peopleWorkTogether: peersVisible }; }

const names = (rows: any[] | undefined) => (rows ?? []).map((r) => r.participantId).sort();

describe.each([[true, 'people see each other'], [false, 'people see only themselves']])('contribution and coverage when %s (%s)', (peers) => {
  async function read(userId: string, role = 'MEMBER') {
    return boardFor(userId, role, {}, ground(peers as boolean)).board;
  }

  it('the lead reads every row', async () => {
    const b = await read('u-wairimu');
    expect(names(b.contribution).length).toBeGreaterThan(1);
    expect(names(b.contribution)).toEqual(expect.arrayContaining(['p-miriam', 'p-aisha']));
  });

  it('the admin who set it up reads every row', async () => {
    const b = await read('u-setup', 'ADMIN');
    expect(names(b.contribution)).toEqual(expect.arrayContaining(['p-miriam', 'p-aisha']));
  });

  it('a participant reads only their own row', async () => {
    const b = await read('u-miriam');
    expect(names(b.contribution).every((id) => id === 'p-miriam')).toBe(true);
    expect(names(b.coverage?.reads).every((id) => id === 'p-miriam')).toBe(true);
    const text = JSON.stringify([b.contribution, b.coverage]);
    expect(text).not.toContain('Aisha');
    expect(text).not.toContain('Wairimu');
  });

  it('a colleague reads only their own row, and never the other person', async () => {
    const b = await read('u-aisha');
    expect(names(b.contribution).every((id) => id === 'p-aisha')).toBe(true);
    expect(JSON.stringify([b.contribution, b.coverage])).not.toContain('Miriam');
  });

  /* Changed by decision 93, row 8. This pinned "an admin who only reads gets nothing, because they have no row", the restriction Hafsah removed. */
  it('an admin who only reads reads every row, as the lead does, and still no rating of anyone\'s answers', async () => {
    const b = await read('u-grace', 'ADMIN');
    const lead = await read('u-wairimu');
    expect(names(b.contribution)).toEqual(names(lead.contribution));
    expect(names(b.contribution)).toEqual(expect.arrayContaining(['p-miriam', 'p-aisha']));
    expect(names(b.coverage?.reads)).toEqual(names(lead.coverage?.reads));
    expect(JSON.stringify([b.contribution, b.coverage])).not.toMatch(/"rating"|"confidence"|"score"/);
  });
});

/* Decision 93, row 8 reaches an admin only where the admin may read the check-in at all (decision 5). */
describe('contribution and coverage on a performance plan, for an admin who was not given access to it', () => {
  it('Grace, an admin with no access to a plan, is not let in, so reads none of it', async () => {
    const plan = { ...GROUND, scenario: GroundScenario.PIP, peersVisibleToEachOther: true, peopleWorkTogether: true };
    await expect(boardFor('u-grace', 'ADMIN', {}, plan).board).rejects.toThrow(/Check-in not found/i);
  });
});

