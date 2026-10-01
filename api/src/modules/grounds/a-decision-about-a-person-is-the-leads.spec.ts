import { GroundsService } from './grounds.service';
import { BoardService } from '../board/board.service';
import { ReportsService } from '../reports/reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';

/**
 * REQUEST 42, REPLACED BY DECISION 46 (29 SEPTEMBER 2026): A DECISION ABOUT A PERSON IS THE LEAD'S,
 * NOT A TARGET ANYBODY ELSE READS - AND IT IS A FIELD THE LEAD SETS, NEVER GUESSED FROM THE WORDING.
 *
 * On a probation check-in the engine wrote the team target "Decide whether to confirm Aisha in her
 * role", and a team target goes to everybody: Aisha read the decision about her on her own Context
 * page. The first fix (request 42, commit 40f25316) tested the target's own text against a pair of
 * regular expressions - a guess, and every guess here is either a false positive that hides an
 * ordinary team target from people who should see it, or a false negative that puts a decision about
 * somebody's place on their own check-in. Hafsah: this is a field the lead sets when the target is
 * made (GroundObjective.isADecisionAboutAPerson), set by the lead alone, never inferred from wording.
 *
 * These read what each person is actually served, on the Context page, the board and her own
 * session's brief, with targets shared with everybody (the widest setting) and with each their own -
 * and check that changing the words on an ordinary team target, with the field left false, never
 * hides it from anybody, since decision 46 is explicit: guessing from wording is gone entirely.
 */
import { ConversationService } from '../conversation/conversation.service';
const WANJIRU = 'u-wanjiru';
const AISHA = 'u-aisha';
const OTIENO = 'u-otieno';

const people = () => [
  { id: 'p-wanjiru', userId: WANJIRU, email: 'w@x.test', partyType: PartyType.INITIATOR, roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly: true, invitedAt: new Date(), notifiedAt: new Date(), soloArtifactAt: null, soloArtifactShared: false, createdAt: new Date('2026-09-01'), user: { firstName: 'Wanjiru', lastName: 'Mwangi' } },
  { id: 'p-aisha', userId: AISHA, email: 'a@x.test', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly: false, invitedAt: new Date(), notifiedAt: new Date(), soloArtifactAt: null, soloArtifactShared: false, createdAt: new Date('2026-09-02'), user: { firstName: 'Aisha', lastName: 'Otieno' } },
  { id: 'p-baraka', userId: 'u-baraka', email: 'b@x.test', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly: false, invitedAt: new Date(), notifiedAt: new Date(), soloArtifactAt: null, soloArtifactShared: false, createdAt: new Date('2026-09-03'), user: { firstName: 'Baraka', lastName: 'Kip' } },
];
const objectives = () => [
  { id: 'o-team', name: 'Water pumps sold this quarter', target: 25, count: 9, prevCount: 8, ownerParticipantId: null, sortOrder: 0, assumes: ['Stock arrives on time.'], isADecisionAboutAPerson: false, createdAt: new Date('2026-09-01'), updatedAt: new Date('2026-09-10') },
  { id: 'o-decide', name: 'Decide whether to confirm Aisha in her role', target: null, count: 0, prevCount: 0, ownerParticipantId: null, sortOrder: 3, assumes: ['Her stock counts stay late.'], isADecisionAboutAPerson: true, createdAt: new Date('2026-09-01'), updatedAt: new Date('2026-09-10') },
  { id: 'o-aisha', name: 'Aisha’s share', target: 12, count: 5, prevCount: 4, ownerParticipantId: 'p-aisha', sortOrder: 1, assumes: ['Aisha keeps her two farm buyers.'], isADecisionAboutAPerson: false, createdAt: new Date('2026-09-01'), updatedAt: new Date('2026-09-10') },
  { id: 'o-baraka', name: 'Baraka’s share', target: 13, count: 4, prevCount: 4, ownerParticipantId: 'p-baraka', sortOrder: 2, assumes: ['Baraka opens the Nakuru route.'], isADecisionAboutAPerson: false, createdAt: new Date('2026-09-01'), updatedAt: new Date('2026-09-10') },
];
const role = (u: string) => (u === OTIENO ? 'ADMIN' : 'MEMBER');

function contextFor(userId: string, whoSeesTargets = 'THEIR_OWN') {
  const ground: any = {
    id: 'g1', organizationId: 'org1', scenario: 'OKR_ALIGNMENT', initiatorId: WANJIRU, createdAt: new Date(), timelineDays: null,
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
          /* The team's target, which the board now says as a full sentence ("The team is aiming for 25 water pumps sold this quarter."). */
          expect(got).toMatch(/water pumps sold this quarter/i);
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

describe('decision 46: it is a field the lead sets, never a guess at the wording', () => {
  it('a target that reads exactly like a decision about somebody stays a team target when the field is not set', async () => {
    /* "Decide whether to confirm Aisha in her role" with the field left false (o-team's twin,
       worded the old trigger phrase but never marked) must still be everybody's, because decision
       46 says nothing is inferred from wording any more - only the field the lead set decides it. */
    const wordedLikeADecisionButNotFlagged = {
      id: 'o-worded', name: 'Decide whether to confirm Aisha in her role', target: null, count: 0, prevCount: 0,
      ownerParticipantId: null, sortOrder: 4, assumes: [], isADecisionAboutAPerson: false,
      createdAt: new Date('2026-09-01'), updatedAt: new Date('2026-09-10'),
    };
    const g = { label: 'Probation', brief: 'Aisha joined in July.', toldToParticipants: null, objectives: [wordedLikeADecisionButNotFlagged], whoSeesTargets: 'EVERYBODY' };
    const briefFor = (reader: any) => (Object.create(ConversationService.prototype) as any).briefFor(g, reader);
    const baraka = briefFor({ participantId: 'p-baraka', isLead: false });
    expect(JSON.stringify(baraka)).toContain('Decide whether to confirm Aisha in her role');
  });

  it('an ordinary-sounding target is kept from everybody but the lead once the field is set', async () => {
    /* The reverse: wording that mentions nothing about anybody's place, but the lead marked it. */
    const flaggedButOrdinaryWording = {
      id: 'o-flagged', name: 'Review the West region numbers', target: null, count: 0, prevCount: 0,
      ownerParticipantId: null, sortOrder: 4, assumes: [], isADecisionAboutAPerson: true,
      createdAt: new Date('2026-09-01'), updatedAt: new Date('2026-09-10'),
    };
    const g = { label: 'Probation', brief: 'Aisha joined in July.', toldToParticipants: null, objectives: [flaggedButOrdinaryWording], whoSeesTargets: 'EVERYBODY' };
    const briefFor = (reader: any) => (Object.create(ConversationService.prototype) as any).briefFor(g, reader);
    const baraka = briefFor({ participantId: 'p-baraka', isLead: false });
    expect(JSON.stringify(baraka)).not.toContain('Review the West region numbers');
    const lead = briefFor({ participantId: 'p-wanjiru', isLead: true });
    expect(JSON.stringify(lead)).toContain('Review the West region numbers');
  });
});

describe('the board write routes: only the lead may set the field, when the target is made or edited', () => {
  function boardServiceWith(initiatorId: string) {
    const ground = { id: 'g1', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED, initiatorId };
    const created: any = {};
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ground) },
      groundObjective: {
        count: jest.fn(async () => 0),
        create: jest.fn(async ({ data }: any) => { Object.assign(created, data); return { id: 'o-new', ...data }; }),
        update: jest.fn(async ({ data }: any) => { Object.assign(created, data); return { id: 'o-1', ...data }; }),
        findUnique: jest.fn(async () => ({ id: 'o-1', groundId: 'g1', count: 0 })),
      },
      checkIn: { findMany: jest.fn(async () => []) },
      groundParticipant: { findFirst: jest.fn(async () => null) },
    };
    const service = new BoardService(prisma, {} as any, {} as any, {} as any);
    return { service, created };
  }

  it('the lead may mark a new target as a decision about a person', async () => {
    const { service, created } = boardServiceWith(WANJIRU);
    await service.createObjective('g1', WANJIRU, { name: 'Decide on Aisha', isADecisionAboutAPerson: true });
    expect(created.isADecisionAboutAPerson).toBe(true);
  });

  it('a new target defaults to false when the lead says nothing', async () => {
    const { service, created } = boardServiceWith(WANJIRU);
    await service.createObjective('g1', WANJIRU, { name: 'Water pumps sold' });
    expect(created.isADecisionAboutAPerson).toBe(false);
  });

  it('the lead may set it later, editing an existing target', async () => {
    const { service, created } = boardServiceWith(WANJIRU);
    await service.updateObjective('g1', 'o-1', WANJIRU, { isADecisionAboutAPerson: true });
    expect(created.isADecisionAboutAPerson).toBe(true);
  });

  it('nobody but the lead can create or edit a target at all, so nobody else can set the field either', async () => {
    const { service } = boardServiceWith(WANJIRU);
    await expect(service.createObjective('g1', 'u-somebody-else', { name: 'Decide on Aisha', isADecisionAboutAPerson: true }))
      .rejects.toThrow('Only the person who set this check-in up can change what it is aiming for');
  });
});
