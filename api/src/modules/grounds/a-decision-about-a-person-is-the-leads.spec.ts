import { GroundsService } from './grounds.service';
import { BoardService } from '../board/board.service';
import { ReportsService } from '../reports/reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';

/**
 * REQUEST 42: A DECISION ABOUT A PERSON IS THE LEAD'S, NOT A TARGET ANYBODY ELSE READS.
 *
 * On a probation check-in the engine wrote the team target "Decide whether to confirm Aisha in her
 * role", and a team target goes to everybody: Aisha read the decision about her on her own Context
 * page. These read what each person is actually served, on the Context page, the board and her own
 * session's brief, with targets shared with everybody (the widest setting) and with each their own.
 */
import { ConversationService } from '../conversation/conversation.service';
import { isADecisionAboutAPerson } from '../board/a-decision-about-a-person-is-the-leads';
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
  { id: 'o-decide', name: 'Decide whether to confirm Aisha in her role', target: null, count: 0, prevCount: 0, ownerParticipantId: null, sortOrder: 3, assumes: ['Her stock counts stay late.'], createdAt: new Date('2026-09-01'), updatedAt: new Date('2026-09-10') },
  { id: 'o-aisha', name: 'Aisha’s share', target: 12, count: 5, prevCount: 4, ownerParticipantId: 'p-aisha', sortOrder: 1, assumes: ['Aisha keeps her two farm buyers.'], createdAt: new Date('2026-09-01'), updatedAt: new Date('2026-09-10') },
  { id: 'o-baraka', name: 'Baraka’s share', target: 13, count: 4, prevCount: 4, ownerParticipantId: 'p-baraka', sortOrder: 2, assumes: ['Baraka opens the Nakuru route.'], createdAt: new Date('2026-09-01'), updatedAt: new Date('2026-09-10') },
];
const role = (u: string) => (u === OTIENO ? 'ADMIN' : 'MEMBER');

function contextFor(userId: string, whoSeesTargets = 'THEIR_OWN') {
  const ground: any = {
    id: 'g1', organizationId: 'org1', initiatorId: WANJIRU, createdAt: new Date(), timelineDays: null,
    restrictExternalVisibility: true, peersVisibleToEachOther: true, whoSeesTargets,
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

function boardFor(userId: string, whoSeesTargets = 'THEIR_OWN') {
  const ground: any = {
    id: 'g1', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED, initiatorId: WANJIRU, createdByUserId: WANJIRU,
    organizationId: 'org1', peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'WEEKLY',
    whoSeesTargets, label: 'Sales', participants: people(), checkIns: [], report: null, objectives: objectives(), dependencies: [], poll: null,
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


const DECISION = 'Decide whether to confirm Aisha in her role';
const served = async (read: (u: string, w?: string) => Promise<any>, u: string, w: string) => JSON.stringify(await read(u, w));

describe('the decision about Aisha, as each person is served it', () => {
  for (const whoSees of ['EVERYBODY', 'THEIR_OWN']) {
    for (const [route, read] of [
      ['the Context page (GET /grounds/:id)', contextFor],
      ['the board (GET /board/:groundId)', boardFor],
    ] as const) {
      describe(`${route}, targets seen by ${whoSees}`, () => {
        it('Wanjiru, who leads it, reads it', async () => {
          expect(await served(read, WANJIRU, whoSees)).toContain(DECISION);
        });
        it('Aisha, whom it is about, does not, nor what it assumes', async () => {
          const got = await served(read, AISHA, whoSees);
          expect(got).not.toContain('confirm Aisha');
          expect(got).not.toContain('stock counts stay late');
          /* And she still reads the team's target, so this is not a page that lost its targets. */
          expect(got).toContain('Water pumps sold this quarter');
        });
        it('Baraka, a colleague, does not', async () => {
          expect(await served(read, 'u-baraka', whoSees)).not.toContain('confirm Aisha');
        });
        it('Otieno, an admin who only reads, does not', async () => {
          expect(await served(read, OTIENO, whoSees)).not.toContain('confirm Aisha');
        });
      });
    }
  }

  it('her own session’s brief does not carry it; the lead’s does', () => {
    const g = { label: 'Probation', brief: 'Aisha joined in July.', toldToParticipants: null, objectives: objectives(), whoSeesTargets: 'EVERYBODY' };
    const briefFor = (reader: any) => (Object.create(ConversationService.prototype) as any).briefFor(g, reader);
    const hers = briefFor({ participantId: 'p-aisha', isLead: false });
    expect(JSON.stringify(hers)).not.toContain('confirm Aisha');
    const leads = briefFor({ participantId: 'p-wanjiru', isLead: true });
    expect(JSON.stringify(leads)).toContain(DECISION);
  });
});

describe('what counts as a decision about a person', () => {
  it.each([
    'Decide whether to confirm Aisha in her role',
    'Decide on Daniel’s probation by the end of October',
    'Make a decision on whether to renew Kofi’s contract',
    'Final decision on his promotion',
  ])('"%s" is the lead’s', (name) => expect(isADecisionAboutAPerson(name)).toBe(true));

  it.each([
    'Water pumps sold this quarter',
    'Decide on the new supplier for the Nakuru route',
    'Confirm delivery slots with the warehouse',
    'Each person’s role in the launch is written down',
  ])('"%s" stays a team target', (name) => expect(isADecisionAboutAPerson(name)).toBe(false));
});
