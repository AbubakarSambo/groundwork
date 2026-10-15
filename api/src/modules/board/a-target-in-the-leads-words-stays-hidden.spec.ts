import { GroundsService } from '../grounds/grounds.service';
import { BoardService } from './board.service';
import { ReportsService } from '../reports/reports.service';
import { ConversationService } from '../conversation/conversation.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { targetsInTheirRemit, targetsHiddenFrom, namesOnTheRoster } from './a-hidden-target-stays-hidden';

/**
 * A TARGET WRITTEN ONLY IN THE LEAD'S WORDS ABOUT SOMEBODY STAYS WITH ITS OWNER (29 September 2026).
 *
 * Read live on a check-in where each person sees only their own target: the lead wrote "Target 14
 * approved facilities this quarter." into what they said about Ngozi and set no objective for it, and
 * Femi read "Ngozi Eze is trying to get 14 new facilities approved and have N42 million disbursed."
 * Read here as the lead (Bisi), Ngozi, a colleague (Femi) and an admin who only reads (Grace), on the
 * Context page, the board, the report and the brief a check-in is given.
 */
const BISI = 'u-bisi';
const NGOZI = 'u-ngozi';
const FEMI = 'u-femi';
const GRACE = 'u-grace';
const role = (u: string) => (u === GRACE ? 'ADMIN' : 'MEMBER');

const person = (id: string, userId: string, first: string, last: string, roleAsDescribed: string | null, partyType: PartyType = PartyType.PARTICIPANT) => ({
  id, userId, email: `${id}@x.test`, partyType, roleAsDescribed, remitAsGiven: null, nameGiven: null, organisationGiven: null,
  managingOnly: partyType === PartyType.INITIATOR, invitedAt: new Date(), notifiedAt: new Date(), soloArtifactAt: null, soloArtifactShared: false,
  createdAt: new Date('2026-09-01'), user: { firstName: first, lastName: last },
});
const people = () => [
  person('p-bisi', BISI, 'Bisi', 'Adeyemi', null, PartyType.INITIATOR),
  person('p-femi', FEMI, 'Femi', 'Okonkwo', 'Relationship officer, Lagos mainland. Target 12 approved facilities this quarter.'),
  person('p-ngozi', NGOZI, 'Ngozi', 'Eze', 'Relationship officer, Ikeja. Target 14 approved facilities this quarter.'),
];
const NGOZIS = 'Ngozi Eze is trying to get 14 new facilities approved and have N42 million disbursed.';
const FEMIS = 'Femi Okonkwo is trying to get 12 new facilities approved.';
const TEAM = 'The team will have 40 approved facilities this quarter.';
const PICTURE = `All three have answered. ${NGOZIS} ${FEMIS} ${TEAM}`;

function contextFor(userId: string) {
  const ground: any = {
    id: 'g1', organizationId: 'org1', scenario: 'OKR_ALIGNMENT', initiatorId: BISI, createdAt: new Date(), timelineDays: null,
    restrictExternalVisibility: true, peersVisibleToEachOther: true, whoSeesTargets: 'THEIR_OWN', brief: PICTURE,
    participants: people(), checkIns: [], resolution: null, patternDetections: [], objectives: [],
    report: { id: 'r1', releasedAt: new Date(), sharedPicture: PICTURE, createdAt: new Date() },
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
    id: 'g1', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED, initiatorId: BISI, createdByUserId: BISI,
    organizationId: 'org1', peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'WEEKLY',
    whoSeesTargets: 'THEIR_OWN', label: 'Credit sales', participants: people(), checkIns: [],
    report: { releasedAt: new Date(), sharedAs: null, theOpening: null, networkPicture: null, sharedPicture: PICTURE, agreements: [], divergences: [], centralQuestion: PICTURE, engagement: {}, findings: [], createdAt: new Date(), updatedAt: new Date() },
    objectives: [], dependencies: [], poll: null,
  };
  const reads = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })) };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own });
  const prisma: any = new Proxy({
    ground: model({ findUnique: jest.fn(async () => {
      const g = JSON.parse(JSON.stringify(ground));
      for (const k of ['releasedAt', 'createdAt', 'updatedAt']) g.report[k] = new Date(g.report[k]);
      return g;
    }) }),
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

function reportFor(userId: string) {
  /* The wrapper the team report and every session report end in. */
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => ({ initiatorId: BISI, organizationId: 'org1', whoSeesTargets: 'THEIR_OWN', scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: true, participants: people(), objectives: [] })) },
    user: { findUnique: jest.fn(async () => ({ role: role(userId), organizationId: 'org1' })), findFirst: jest.fn(async () => null) },
    groundDocument: { findMany: jest.fn(async () => []) },
    personObjective: { findMany: jest.fn(async () => []) },
  };
  const svc = Object.create(ReportsService.prototype) as any;
  svc.prisma = prisma;
  svc.logger = { warn: () => undefined, log: () => undefined };
  return svc.whatTheLeadHasNotShared('g1', userId, 'org1', { sharedPicture: PICTURE, findings: [{ who: 'Ngozi Eze', finding: NGOZIS }, { who: 'Femi Okonkwo', finding: FEMIS }] });
}

const text = async (p: Promise<any>) => JSON.stringify(await p);
const has14 = /trying to get 14|Ngozi Eze[^"]*\b14\b/;
const has12 = /trying to get 12/;

describe('each person\'s target from the lead\'s words about them, on a check-in where each sees their own', () => {
  for (const [where, read] of [['the Context page', contextFor], ['the board', boardFor], ['the report', reportFor]] as const) {
    describe(where, () => {
      it('Bisi, the lead, reads everybody\'s', async () => {
        const got = await text(read(BISI));
        expect(got).toMatch(has14);
        expect(got).toMatch(has12);
      });
      /* Changed with decision 75, item 13: on the Context page a participant read their own figure only through
         the lead's brief, which is no longer quoted to anybody but the lead. They still never read a colleague's. */
      it('Ngozi reads her own and not Femi\'s', async () => {
        const got = await text(read(NGOZI));
        if (where !== 'the Context page') expect(got).toMatch(has14);
        expect(got).not.toMatch(has12);
      });
      it('Femi, a colleague, reads his own and not Ngozi\'s', async () => {
        const got = await text(read(FEMI));
        expect(got).not.toMatch(has14);
        if (where !== 'the Context page') expect(got).toMatch(has12);
        /* The team's target is everybody's, and stays. (The Context page gives a participant the brief
           as everyone reads it, which already leaves the lead's figures out; that rule is not this one.) */
        if (where !== 'the Context page') expect(got).toContain(TEAM);
      });
      /* Decision 86 item 3, and 93: an admin sees the figures, so Grace reads both on the board and on the Context page. The report
         is not changed by it, and there she still reads neither. */
      it(where !== 'the report' ? 'Grace, an admin who only reads, reads both (decision 86)' : 'Grace, an admin who only reads, reads neither', async () => {
        const got = await text(read(GRACE));
        if (where !== 'the report') {
          expect(got).toMatch(has14);
          expect(got).toMatch(has12);
          return;
        }
        expect(got).not.toMatch(has14);
        expect(got).not.toMatch(has12);
      });
    });
  }

  it('the brief a person\'s check-in is given carries only their own', () => {
    const g = { brief: `Credit sales this quarter. ${NGOZIS} ${FEMIS}`, whoSeesTargets: 'THEIR_OWN', objectives: [], participants: people() };
    const brief = (participantId: string, partyType: PartyType = PartyType.PARTICIPANT) =>
      (Object.create(ConversationService.prototype) as any).theBriefThisPersonMayBeGiven(g, { participantId, participant: { partyType } });
    expect(brief('p-femi')).not.toMatch(has14);
    expect(brief('p-femi')).toMatch(has12);
    expect(brief('p-ngozi')).toMatch(has14);
    expect(brief('p-bisi', PartyType.INITIATOR)).toMatch(has14);
  });

  it('where targets are shared with everybody, nothing is taken out', () => {
    expect(targetsHiddenFrom({ participantId: 'p-femi', isTheLead: false }, 'EVERYBODY', [], namesOnTheRoster(people()), people())).toEqual([]);
  });

  it('reads a number as a target only from a sentence about a target', () => {
    expect(targetsInTheirRemit('Relationship officer, Ikeja. Target 14 approved facilities this quarter.')).toEqual([14]);
    expect(targetsInTheirRemit('Aiming for N42 million disbursed and 14 facilities.')).toEqual([42e6, 14]);
    expect(targetsInTheirRemit('Engagement Director, first 90 days.')).toEqual([]);
    expect(targetsInTheirRemit('Her target for 2026 is 5 sales.')).toEqual([5]);
  });
});
