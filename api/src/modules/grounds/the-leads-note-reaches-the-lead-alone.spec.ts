import { GroundsService } from './grounds.service';
import { BoardService } from '../board/board.service';
import { ReportsService } from '../reports/reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';

/**
 * THE LEAD'S NOTE ABOUT A PERSON REACHES THE LEAD, AND NOBODY ELSE (U.7 review, a privacy fix).
 *
 * Read live on Wanjiru's check-in: Otieno, an admin of the organisation who is not in it, opened the
 * Context page and read "Baraka. Your note: Baraka is a member of the team...". The note is what
 * Wanjiru typed when she added Baraka. A lead's private notes are private, always, so every route
 * that serves the people in a check-in is asked here as Wanjiru (the lead), Aisha (who takes part)
 * and Otieno (an admin not in it). Only Wanjiru is given the note.
 */
const NOTE = 'Baraka - Baraka is a member of the team who has been slow to follow up.';
const WANJIRU = 'u-wanjiru';
const AISHA = 'u-aisha';
const OTIENO = 'u-otieno';

const people = () => [
  { id: 'p-wanjiru', userId: WANJIRU, email: 'wanjiru@x.test', partyType: PartyType.INITIATOR, roleAsDescribed: 'Runs sales', nameGiven: null, organisationGiven: null, managingOnly: false, invitedAt: new Date(), notifiedAt: new Date(), soloArtifactAt: null, soloArtifactShared: false, createdAt: new Date('2026-09-01'), user: { firstName: 'Wanjiru', lastName: 'Mwangi' } },
  { id: 'p-aisha', userId: AISHA, email: 'aisha@x.test', partyType: PartyType.PARTICIPANT, roleAsDescribed: 'Aisha - sells to butcheries', nameGiven: null, organisationGiven: null, managingOnly: false, invitedAt: new Date(), notifiedAt: new Date(), soloArtifactAt: null, soloArtifactShared: false, createdAt: new Date('2026-09-02'), user: { firstName: 'Aisha', lastName: 'Otieno' } },
  { id: 'p-baraka', userId: null, email: 'baraka@x.test', partyType: PartyType.PARTICIPANT, roleAsDescribed: NOTE, nameGiven: 'Baraka', organisationGiven: null, managingOnly: false, invitedAt: new Date(), notifiedAt: null, soloArtifactAt: null, soloArtifactShared: false, createdAt: new Date('2026-09-03'), user: null },
];

const role = (userId: string) => (userId === OTIENO ? 'ADMIN' : 'MEMBER');

/* ---- GET /grounds/:id ---- */
function groundsFor(userId: string) {
  const ground: any = {
    id: 'g1', organizationId: 'org1', scenario: 'OKR_ALIGNMENT', initiatorId: WANJIRU, createdAt: new Date(), timelineDays: null,
    restrictExternalVisibility: true, peersVisibleToEachOther: true, whoSeesTargets: 'THEIR_OWN',
    participants: people(), checkIns: [], resolution: null, patternDetections: [], objectives: [],
    report: { id: 'r1', releasedAt: new Date(), sharedPicture: null, createdAt: new Date() },
  };
  const prisma: any = {
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => []) },
    ground: { findFirst: async () => ground, findUnique: async () => ground, findMany: jest.fn(async () => [{ ...ground, label: 'Sales', status: 'ACTIVE', scenario: 'OKR_ALIGNMENT', cadence: 'WEEKLY', updatedAt: new Date(), reportRounds: [], dependencies: [], reportActivations: [] }]) },
    user: { findUnique: jest.fn(async () => ({ role: role(userId), organizationId: 'org1' })) },
    groundParticipant: { findFirst: async () => null, findMany: async () => [], updateMany: jest.fn(async () => ({ count: 0 })) },
    organization: { findUnique: async () => ({ subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE', freeExtensionUsed: false }) },
    leadContextNote: { findMany: async () => [] },
  };
  const reports = new ReportsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any, { get: () => reports } as any);
}

/* ---- GET /grounds/org-roster (admins only) ---- */
function rosterFor() {
  const prisma: any = {
    ground: {
      findMany: jest.fn(async () => [{
        id: 'g1', label: 'Sales', scenario: 'OKR_ALIGNMENT', status: 'ACTIVE', cadence: 'WEEKLY', createdByUserId: null,
        createdAt: new Date('2026-09-01'), initiator: { id: WANJIRU, firstName: 'Wanjiru', lastName: 'Mwangi', email: 'wanjiru@x.test' },
        participants: people().map((p) => ({ ...p, inviteDeliveryStatus: null, checkIns: [] })), report: null,
      }]),
    },
  };
  return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any);
}

/* ---- GET /board/:groundId ---- */
function boardFor(userId: string) {
  const ground: any = {
    id: 'g1', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED, initiatorId: WANJIRU, createdByUserId: WANJIRU,
    organizationId: 'org1', peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'WEEKLY',
    whoSeesTargets: 'THEIR_OWN', label: 'Sales', participants: people(), checkIns: [], report: null, objectives: [], dependencies: [], poll: null,
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

describe('the lead\'s note about Baraka, route by route', () => {
  for (const [route, read] of [
    ['the check-in (GET /grounds/:id)', (u: string) => groundsFor(u).get('g1', 'org1', u)],
    ['the check-ins list (GET /grounds)', async (u: string) => ((await groundsFor(u).list('org1', u, `${u}@x.test`, role(u))) as any[])[0]],
    ['the board (GET /board/:groundId)', (u: string) => boardFor(u)],
  ] as const) {
    describe(route, () => {
      it('Wanjiru, who leads it and wrote it, is given it', async () => {
        expect(JSON.stringify(await read(WANJIRU))).toContain('slow to follow up');
      });
      it('Aisha, who takes part, is not', async () => {
        expect(JSON.stringify(await read(AISHA))).not.toContain('slow to follow up');
      });
      it('Otieno, an admin who is not in it, is not', async () => {
        expect(JSON.stringify(await read(OTIENO))).not.toContain('slow to follow up');
      });
    });
  }

  describe('the organisation roster (GET /grounds/org-roster), which only admins can open', () => {
    it('gives the note to the admin who leads that check-in', async () => {
      const [row] = await rosterFor().getOrgRoster('org1', WANJIRU);
      expect(JSON.stringify(row)).toContain('slow to follow up');
    });
    it('and not to an admin who does not', async () => {
      const [row] = await rosterFor().getOrgRoster('org1', OTIENO);
      expect(JSON.stringify(row)).not.toContain('slow to follow up');
      expect(row.members.every((m: any) => m.roleAsDescribed === null)).toBe(true);
    });
  });
});
