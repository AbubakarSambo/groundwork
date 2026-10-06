import { GroundsService } from './grounds.service';
import { BoardService } from '../board/board.service';
import { ReportsService } from '../reports/reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';

/**
 * ONE RULE FOR WHOSE SHARE OF A TARGET IS SHOWN, ON THE CONTEXT PAGE AND ON THE BOARD (U.7 review).
 *
 * Read live on Wanjiru's check-in: Otieno, an admin of the organisation who is not in it, was shown
 * only the team's targets on the Context page (GET /grounds/:id) and every person's share,
 * Baraka's included, on the board (GET /board/:groundId). The stricter rule now holds on both: the
 * check-in's lead sees every share; anybody else sees the team's targets and their own share.
 */
const WANJIRU = 'u-wanjiru';
const AISHA = 'u-aisha';
const OTIENO = 'u-otieno';

const people = () => [
  { id: 'p-wanjiru', userId: WANJIRU, email: 'w@x.test', partyType: PartyType.INITIATOR, roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly: true, invitedAt: new Date(), notifiedAt: new Date(), soloArtifactAt: null, soloArtifactShared: false, createdAt: new Date('2026-09-01'), user: { firstName: 'Wanjiru', lastName: 'Mwangi' } },
  { id: 'p-aisha', userId: AISHA, email: 'a@x.test', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly: false, invitedAt: new Date(), notifiedAt: new Date(), soloArtifactAt: null, soloArtifactShared: false, createdAt: new Date('2026-09-02'), user: { firstName: 'Aisha', lastName: 'Otieno' } },
  { id: 'p-baraka', userId: 'u-baraka', email: 'b@x.test', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly: false, invitedAt: new Date(), notifiedAt: new Date(), soloArtifactAt: null, soloArtifactShared: false, createdAt: new Date('2026-09-03'), user: { firstName: 'Baraka', lastName: 'Kip' } },
];
const objectives = () => [
  { id: 'o-team', name: 'Water pumps sold this quarter', target: 25, count: 9, prevCount: 8, ownerParticipantId: null, sortOrder: 0, assumes: ['Stock arrives on time.'], createdAt: new Date('2026-09-01'), updatedAt: new Date('2026-09-10') },
  { id: 'o-aisha', name: 'Aisha’s share', target: 12, count: 5, prevCount: 4, ownerParticipantId: 'p-aisha', sortOrder: 1, assumes: ['Aisha keeps her two farm buyers.'], createdAt: new Date('2026-09-01'), updatedAt: new Date('2026-09-10') },
  { id: 'o-baraka', name: 'Baraka’s share', target: 13, count: 4, prevCount: 4, ownerParticipantId: 'p-baraka', sortOrder: 2, assumes: ['Baraka opens the Nakuru route.'], createdAt: new Date('2026-09-01'), updatedAt: new Date('2026-09-10') },
];
const role = (u: string) => (u === OTIENO ? 'ADMIN' : 'MEMBER');

function contextFor(userId: string) {
  const ground: any = {
    id: 'g1', organizationId: 'org1', scenario: 'OKR_ALIGNMENT', initiatorId: WANJIRU, createdAt: new Date(), timelineDays: null,
    restrictExternalVisibility: true, peersVisibleToEachOther: true, whoSeesTargets: 'THEIR_OWN',
    participants: people(), checkIns: [], resolution: null, patternDetections: [], objectives: objectives(),
    report: { id: 'r1', releasedAt: new Date(), sharedPicture: null, createdAt: new Date() },
  };
  const prisma: any = {
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => []) },
    ground: { findFirst: async () => ground, findUnique: async () => ground },
    user: { findUnique: jest.fn(async () => ({ role: role(userId), organizationId: 'org1' })) },
    groundParticipant: { findFirst: async () => null, findMany: async () => [] },
    organization: { findUnique: async () => ({ subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE', freeExtensionUsed: false }) },
    leadContextNote: { findMany: async () => [] },
  };
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any)
    .get('g1', 'org1', userId) as Promise<any>;
}

function boardFor(userId: string) {
  const ground: any = {
    id: 'g1', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED, initiatorId: WANJIRU, createdByUserId: WANJIRU,
    organizationId: 'org1', peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'WEEKLY',
    whoSeesTargets: 'THEIR_OWN', label: 'Sales', participants: people(), checkIns: [], report: null, objectives: objectives(), dependencies: [], poll: null,
  };
  const reads = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })) };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own });
  const prisma: any = new Proxy({
    ground: model({ findUnique: jest.fn(async () => JSON.parse(JSON.stringify(ground))) }),
    user: model({ findUnique: jest.fn(async () => ({ role: role(userId), organizationId: 'org1' })) }),
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
  const reports = Object.create(ReportsService.prototype) as ReportsService;
  return new BoardService(prisma, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports)
    .get('g1', userId) as Promise<any>;
}

/* By the row, not its name (1 October 2026): the board now serves each name as a full sentence for
   its reader ("Your share is 12."), while the Context page serves the name as stored. Which rows reach
   which reader is the same check as before, as strict, on both routes. */
const names = (rows: any[] | undefined) => (rows ?? []).map((o) => ({ 'o-team': 'Water pumps sold this quarter', 'o-aisha': 'Aisha’s share', 'o-baraka': 'Baraka’s share' } as Record<string, string>)[o.id] ?? o.id);

describe('whose share of a target each reader is given', () => {
  for (const [route, read] of [
    ['the Context page (GET /grounds/:id)', contextFor],
    ['the board (GET /board/:groundId)', boardFor],
  ] as const) {
    describe(route, () => {
      it('Wanjiru, who leads it, is given the team target and every share', async () => {
        expect(names((await read(WANJIRU)).objectives)).toEqual(['Water pumps sold this quarter', 'Aisha’s share', 'Baraka’s share']);
      });
      it('Aisha is given the team target and her own share, not Baraka’s', async () => {
        const got = await read(AISHA);
        expect(names(got.objectives)).toEqual(['Water pumps sold this quarter', 'Aisha’s share']);
        expect(JSON.stringify(got)).not.toContain('Nakuru route');
      });
      /* Decision 86 item 3 (and 93) reverses decision 73 for admins: an admin with access sees every share, on the board and on the
         check-in page. */
      it('Otieno, an admin who is not in it, is given every share (decision 86)', async () => {
        const got = await read(OTIENO);
        expect(names(got.objectives)).toEqual(['Water pumps sold this quarter', 'Aisha’s share', 'Baraka’s share']);
      });
    });
  }

  it('and on the board each share is a full sentence for its reader', async () => {
    expect(((await boardFor(WANJIRU)).objectives as any[]).map((o) => o.name)).toEqual(['The team is aiming for 25 water pumps sold this quarter.', 'Aisha Otieno\'s share is 12.', 'Baraka Kip\'s share is 13.']);
    expect(((await boardFor(AISHA)).objectives as any[]).map((o) => o.name)).toEqual(['The team is aiming for 25 water pumps sold this quarter.', 'Your share is 12.']);
  });

  /* Decision 86: this used to pin that Otieno read where each person is without their number. */
  it('and the board’s person-by-person read gives Otieno each person’s number, as Wanjiru reads it', async () => {
    const rows = (await boardFor(OTIENO)).eachPerson ?? [];
    expect(rows.map((r: any) => r.target).sort()).toEqual([12, 13]);
    const leads = (await boardFor(WANJIRU)).eachPerson ?? [];
    expect(leads.map((r: any) => r.target).sort()).toEqual([12, 13]);
  });
});
