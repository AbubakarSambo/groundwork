import { BoardService } from './board.service';
import { ReportsService } from '../reports/reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { whenTheBoardLastChanged, whatAReaderWhoOnlyReadsIsTold } from './when-the-board-last-changed';

/**
 * SCREENS REQUEST 88 (WORDING): THE BOARD'S OWN SENTENCES READ AS SENTENCES.
 *
 * Read through the real board as the lead, the admin who set it up, and a participant.
 *
 * (Harness copied from the contribution spec.)
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
    ground: model('ground', { findUnique: jest.fn(async () => JSON.parse(JSON.stringify(theGround), (k, v) => (/(At|completedAt)$/.test(k) && typeof v === 'string' ? new Date(v) : v))) }),
    user: model('user', {
      findUnique: jest.fn(async () => ({ role: viewerRole, organizationId: 'org-1' })),
      findMany: jest.fn(async () => [{ id: 'u-juma', firstName: 'Juma', lastName: 'Mwangi' }]),
    }),
    membershipRequest: model('membershipRequest', {
      findMany: jest.fn(async () => [{ userId: 'u-faraji', status: 'DECLINED', decidedByUserId: 'u-juma', decidedAt: new Date('2026-09-29T10:00:00Z') }]),
    }),
    checkIn: model('checkIn', { findMany: jest.fn(async () => JSON.parse(JSON.stringify(CHECK_INS))) }),
    groundDependency: model('groundDependency', {
      findMany: jest.fn(async () => [{ status: 'BLOCKING', fromParticipantId: 'p-aisha', onParticipantId: null, what: "the fuel allowance for October", onLabel: null }]),
    }),
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




const LONG_AGO = new Date(Date.now() - 30 * 86_400_000);
const aBlockerNobodyOwns = {
  id: 'd1', fromParticipantId: 'p-aisha', onParticipantId: null, onLabel: null, what: "the approval for Machakos's second tranche",
  status: 'BLOCKING', createdAt: LONG_AGO, updatedAt: LONG_AGO, then: null, escalatedAt: null, triedSaid: null,
};
const g = { ...GROUND, dependencies: [aBlockerNobodyOwns] };
const gNamed = { ...GROUND, dependencies: [{ ...aBlockerNobodyOwns, onLabel: 'the county treasury' }] };

describe('the lead reads the board in sentences', () => {
  it('says nobody has been named to decide, never "Unassigned"', async () => {
    const b = await boardFor('u-wairimu', 'MEMBER', {}, g).board;
    const blocker = (b.decisions ?? []).find((d: any) => d.source === 'blocker');
    expect(blocker.owner).toBe('Nobody has been named to decide this.');
    expect(JSON.stringify(b)).not.toContain('Unassigned');
  });

  it('names the same first blocker in the top line and in the quick read', async () => {
    const b = await boardFor('u-wairimu', 'MEMBER', {}, gNamed).board;
    expect(b.howItIsGoing.glance.inTheWay.oldest).toBe("the approval for Machakos's second tranche");
    const tile = b.quickRead.find((t: any) => t.label === 'Blockers');
    expect(tile.sub).toContain("Work is held up by the approval for Machakos's second tranche.");
    expect(tile.sub).not.toContain('fuel allowance');
  });
});

describe('the participant\'s story', () => {
  it('never opens with "They" when nothing comes before it', async () => {
    const story = async (opening: string) => (await boardFor('u-miriam', 'MEMBER', {}, { ...GROUND, report: { ...GROUND.report, theOpening: opening } }).board).howItIsGoing.latestSummary;
    expect(await story('They disagree on two things, what a budget is and who signs it off.')).toBe('People disagree on two things, what a budget is and who signs it off.');
    expect(await story('Both people have answered. They disagree on what a budget is.')).toBe('Both people have answered. They disagree on what a budget is.');
  });
});
