import { GroundsService } from './grounds.service';
import { BoardService } from '../board/board.service';
import { ReportsService } from '../reports/reports.service';
import { YourBoardService } from './your-board.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import {
  withoutGoalsNotToldIn, notToldYet, theAreaOfAGoal, aWeekHasPassedSinceNotTold,
  theLeadIsNudgedToTell, theConversationPointForTheLead, whatThePersonReadsAfterAWeek,
} from './a-goal-not-told-stays-with-the-lead';

/**
 * A GOAL THE LEAD HAS NOT TOLD THE PERSON ABOUT IS NOT SHOWN TO THAT PERSON (29 September 2026).
 *
 * Read live: Tobi's You board listed "Take over the scheduling.", a goal his lead had written and
 * marked NOT_TOLD, and his Context page carried the lead's words about it. Read here as the lead
 * (Wanjiru), the person (Tobi), a colleague (Baraka) and an admin who only reads (Otieno), on the
 * Context page, the board, the You board and the report.
 */
const WANJIRU = 'u-wanjiru';
const TOBI = 'u-tobi';
const BARAKA = 'u-baraka';
const OTIENO = 'u-otieno';
const role = (u: string) => (u === OTIENO ? 'ADMIN' : 'MEMBER');
const GOAL = 'Take over the scheduling.';
const LEADS_NOTE = 'I need to talk to Tobi about taking over the scheduling.';
const TOLD = 'Lead the client conversations fully.';

const people = () => [
  { id: 'p-wanjiru', userId: WANJIRU, email: 'w@x.test', partyType: PartyType.INITIATOR, roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly: true, invitedAt: new Date('2026-09-01T09:00:00Z'), notifiedAt: new Date('2026-09-01T09:05:00Z'), soloArtifactAt: null, soloArtifactShared: false, createdAt: new Date('2026-09-01'), user: { firstName: 'Wanjiru', lastName: 'Mwangi' } },
  { id: 'p-tobi', userId: TOBI, email: 't@x.test', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly: false, invitedAt: new Date('2026-09-02T09:00:00Z'), notifiedAt: new Date('2026-09-02T09:05:00Z'), soloArtifactAt: null, soloArtifactShared: false, createdAt: new Date('2026-09-02'), user: { firstName: 'Tobi', lastName: 'Adewale' } },
  { id: 'p-baraka', userId: BARAKA, email: 'b@x.test', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly: false, invitedAt: new Date('2026-09-03T09:00:00Z'), notifiedAt: new Date('2026-09-03T09:05:00Z'), soloArtifactAt: null, soloArtifactShared: false, createdAt: new Date('2026-09-03'), user: { firstName: 'Baraka', lastName: 'Kip' } },
];
/* Within the week, so the "always hidden" assertions below hold on any day this suite runs
   (decision 56, item 4 makes a NOT_TOLD goal start showing, plainly, after a week - covered in its
   own tests further down, with its own fixture). */
const TWO_DAYS_AGO = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
const GOALS = [
  { id: 'o-not-told', groundId: 'g1', participantId: 'p-tobi', text: GOAL, kind: 'TODO', status: 'OPEN', authoredBy: 'lead', seenBySubject: false, awareness: 'NOT_TOLD', awarenessDetail: LEADS_NOTE, dueSaid: 'tomorrow', createdAt: TWO_DAYS_AGO, updatedAt: TWO_DAYS_AGO },
  { id: 'o-told', groundId: 'g1', participantId: 'p-tobi', text: TOLD, kind: 'GOAL', status: 'OPEN', authoredBy: 'lead', seenBySubject: false, awareness: 'TOLD', awarenessDetail: null, dueSaid: null, createdAt: new Date('2026-09-04'), updatedAt: new Date('2026-09-04') },
];
/* A product sentence carrying the goal, as a report's picture would. */
const PICTURE = `Tobi Adewale has started well. Wanjiru Mwangi expects Tobi Adewale to take over the scheduling. Both have answered.`;

function contextFor(userId: string) {
  const ground: any = {
    id: 'g1', organizationId: 'org1', scenario: 'OKR_ALIGNMENT', initiatorId: WANJIRU, createdAt: new Date('2026-09-20T09:00:00Z'), timelineDays: null,
    restrictExternalVisibility: true, peersVisibleToEachOther: true, whoSeesTargets: 'EVERYBODY',
    participants: people(), checkIns: [], resolution: null, patternDetections: [], objectives: [],
    /* Fixed, not wall-clock: a live new Date() here has previously been rendered somewhere in the
       page text with its minute intact, and a run in minute :40 made unrelated assertions about the
       number 40 pass or fail depending only on when the suite happened to run. */
    report: { id: 'r1', releasedAt: new Date('2026-09-23T17:00:00Z'), sharedPicture: PICTURE, createdAt: new Date('2026-09-20T09:00:00Z') },
  };
  const prisma: any = {
    /* The You board reads the person's own patterns (29 September); none here. */
    patternDetection: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: jest.fn(async () => JSON.parse(JSON.stringify(GOALS))) },
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
    whoSeesTargets: 'EVERYBODY', label: 'Engagement Director, first 90 days', participants: people(), checkIns: [],
    report: { releasedAt: new Date('2026-09-23T17:00:00Z'), sharedAs: null, theOpening: null, networkPicture: null, sharedPicture: PICTURE, agreements: [], divergences: [], centralQuestion: 'Can Tobi Adewale take over the scheduling this month?', engagement: {}, findings: [], createdAt: new Date('2026-09-20T09:00:00Z'), updatedAt: new Date('2026-09-23T15:02:00Z') },
    objectives: [], dependencies: [{ id: 'd1', what: 'Wanjiru Mwangi needs Tobi Adewale to take over the scheduling.', fromParticipantId: 'p-wanjiru', onParticipantId: 'p-tobi', onLabel: null, status: 'WAITING', escalatedAt: null, blockerKind: null, createdAt: new Date('2026-09-10'), updatedAt: new Date('2026-09-10') }], poll: null,
  };
  const reads = { findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null), count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })) };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own });
  const prisma: any = new Proxy({
    /* The You board reads the person's own patterns (29 September); none here. */
    patternDetection: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    ground: model({ findUnique: jest.fn(async () => {
      const g = JSON.parse(JSON.stringify(ground));
      g.dependencies = g.dependencies.map((d: any) => ({ ...d, createdAt: new Date(d.createdAt), updatedAt: new Date(d.updatedAt) }));
      for (const k of ['releasedAt', 'createdAt', 'updatedAt']) g.report[k] = new Date(g.report[k]);
      return g;
    }) }),
    user: model({ findUnique: jest.fn(async () => ({ role: role(userId), organizationId: 'org1' })) }),
    personObjective: model({ findMany: jest.fn(async (q: any) => GOALS.filter((g) => !q?.where?.awareness || g.awareness === q.where.awareness)) }),
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
  /* The wrapper every report read goes through (get and sessionReport both end in it). */
  const prisma: any = {
    /* The You board reads the person's own patterns (29 September); none here. */
    patternDetection: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    ground: { findUnique: jest.fn(async () => ({ initiatorId: WANJIRU, organizationId: 'org1', whoSeesTargets: 'EVERYBODY', scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: true, participants: people(), objectives: [] })) },
    user: { findUnique: jest.fn(async () => ({ role: role(userId), organizationId: 'org1' })), findFirst: jest.fn(async () => null) },
    groundDocument: { findMany: jest.fn(async () => []) },
    personObjective: { findMany: jest.fn(async (q: any) => GOALS.filter((g) => !q?.where?.awareness || g.awareness === q.where.awareness)) },
  };
  const svc = Object.create(ReportsService.prototype) as any;
  svc.prisma = prisma;
  svc.logger = { warn: () => undefined, log: () => undefined };
  return svc.whatTheLeadHasNotShared('g1', userId, 'org1', { sharedPicture: PICTURE, rows: [{ who: 'Tobi Adewale', says: PICTURE }] });
}

function youBoardFor(userId: string) {
  const ground = { id: 'g1', label: 'Engagement Director, first 90 days', status: 'ACTIVE', organizationId: 'org1', initiatorId: WANJIRU, closedAt: null, resolvedAt: null, participants: people().map((p) => ({ id: p.id, userId: p.userId })), checkIns: [] };
  const table = (rows: any[]) => ({ findMany: jest.fn(async ({ where }: any) => rows.filter((r) => !where?.participantId?.in || where.participantId.in.includes(r.participantId))), findFirst: jest.fn(async () => null) });
  const prisma: any = {
    /* The You board reads the person's own patterns (29 September); none here. */
    patternDetection: { findMany: async () => [], updateMany: async () => ({ count: 0 }) }, personObjective: table(GOALS), groundObjective: table([]), groundCommitment: table([]), coachingState: table([]), person: table([]), todo: table([]), groundDependency: table([]) };
  const grounds: any = { list: jest.fn(async () => [ground]) };
  return new YourBoardService(prisma, grounds).forReader({ userId, email: `${userId}@x.test`, role: role(userId), organizationId: 'org1' } as any);
}

const text = async (p: Promise<any>) => JSON.stringify(await p);

describe('a goal the lead has not told Tobi about', () => {
  for (const [where, read] of [['the Context page', contextFor], ['the board', boardFor], ['the report', reportFor]] as const) {
    describe(where, () => {
      it('Wanjiru, the lead, still reads it', async () => {
        expect(await text(read(WANJIRU))).toMatch(/take over the scheduling/i);
      });
      it('Tobi, whom it is about, does not, nor the lead\'s words about it', async () => {
        const got = await text(read(TOBI));
        expect(got).not.toMatch(/take over the scheduling|taking over the scheduling/i);
        expect(got).not.toContain(LEADS_NOTE);
      });
      it('Baraka, a colleague, does not', async () => {
        expect(await text(read(BARAKA))).not.toMatch(/take over the scheduling/i);
      });
      it('Otieno, an admin of the organisation, reads it: it is hidden from Tobi and his colleagues, not from the people who run the work (decisions 5, 48, 56 and 86)', async () => {
        expect(await text(read(OTIENO))).toMatch(/take over the scheduling/i);
      });
    });
  }

  it('the rest of what is served stays: the goal he was told, and the other sentences', async () => {
    const page = await text(contextFor(TOBI));
    expect(page).toContain(TOLD);
    const report: any = await reportFor(TOBI);
    expect(report.sharedPicture).toBe('Tobi Adewale has started well. Both have answered.');
  });

  it('is not on his You board, and a goal he was told is', async () => {
    const b: any = await youBoardFor(TOBI);
    const goals = (b.goals ?? []).map((g: any) => g.says);
    expect(goals).not.toContain(GOAL);
    expect(goals).toContain(TOLD);
  });

  it('a goal Tobi wrote himself is never held back, whatever the awareness says', () => {
    expect(notToldYet({ awareness: 'NOT_TOLD', authoredBy: 'self' })).toBe(false);
    expect(notToldYet({ awareness: 'NOT_TOLD', authoredBy: 'lead' })).toBe(true);
    expect(notToldYet({ awareness: 'UNSURE', authoredBy: 'lead' })).toBe(false);
    expect(withoutGoalsNotToldIn({ id: 'take over the scheduling please', a: 'x' }, [GOAL]).id).toBe('take over the scheduling please');
  });
});

/**
 * DECISION 56: the four parts added on top of the more-private option above.
 */
describe('theAreaOfAGoal (decision 56, item 2)', () => {
  it('takes the number and the deadline out, and leaves the work', () => {
    expect(theAreaOfAGoal('Hit 40 stock counts by Friday')).toBe('Hit stock counts');
  });
  it('takes a currency amount and a date out', () => {
    expect(theAreaOfAGoal('Close $150k of pipeline by October 15')).not.toMatch(/\$|150|october|15/i);
  });
  it('takes a percentage out', () => {
    expect(theAreaOfAGoal('Cut churn by 12%')).not.toMatch(/12|%/);
  });
  it('leaves a goal with no number exactly as it was', () => {
    expect(theAreaOfAGoal('Take over the scheduling')).toBe('Take over the scheduling');
  });
  it('never returns empty: falls back to the original when stripping would remove everything', () => {
    expect(theAreaOfAGoal('40')).toBe('40');
  });
});

describe('aWeekHasPassedSinceNotTold (decision 56, item 4)', () => {
  const now = new Date('2026-09-29T00:00:00Z');
  it('is false the day the goal was set', () => {
    expect(aWeekHasPassedSinceNotTold({ awareness: 'NOT_TOLD', authoredBy: 'lead', createdAt: new Date('2026-09-29T00:00:00Z') }, now)).toBe(false);
  });
  it('is false just short of a week', () => {
    expect(aWeekHasPassedSinceNotTold({ awareness: 'NOT_TOLD', authoredBy: 'lead', createdAt: new Date('2026-09-23T00:00:01Z') }, now)).toBe(false);
  });
  it('is true at exactly a week', () => {
    expect(aWeekHasPassedSinceNotTold({ awareness: 'NOT_TOLD', authoredBy: 'lead', createdAt: new Date('2026-09-22T00:00:00Z') }, now)).toBe(true);
  });
  it('is false once the lead has told them', () => {
    expect(aWeekHasPassedSinceNotTold({ awareness: 'TOLD', authoredBy: 'lead', createdAt: new Date('2026-09-01T00:00:00Z') }, now)).toBe(false);
  });
  it('is false for a goal the person wrote themselves', () => {
    expect(aWeekHasPassedSinceNotTold({ awareness: 'NOT_TOLD', authoredBy: 'self', createdAt: new Date('2026-09-01T00:00:00Z') }, now)).toBe(false);
  });
});

describe('theLeadIsNudgedToTell (decision 56, item 1)', () => {
  it('names the person, never a pronoun, and takes the worded area, never raw goal text', () => {
    const nudge = theLeadIsNudgedToTell('Tobi', 'the scheduling and the stock counts');
    expect(nudge.decide).toBe('Tell Tobi about the goal you set for the scheduling and the stock counts.');
    expect(nudge.why).toBe('You have not told Tobi yet.');
    expect(nudge.decide).not.toMatch(/\bhim\b|\bher\b/i);
  });
  it('falls back to "this part of the work" when there is no area', () => {
    expect(theLeadIsNudgedToTell('Tobi', '').decide).toBe('Tell Tobi about the goal you set for this part of the work.');
  });
});

describe('theConversationPointForTheLead (decision 56, item 3)', () => {
  it('uses the name throughout, never "him" or "her"', () => {
    expect(theConversationPointForTheLead('Tobi')).toBe(
      'Tobi has not been told about this goal yet. Talk it through together before reading anything into it.',
    );
  });
});

describe('whatThePersonReadsAfterAWeek (decision 56, item 4)', () => {
  it('says the lead has set a goal about the worded area, with no number', () => {
    expect(whatThePersonReadsAfterAWeek('Wanjiru', 'the scheduling and the stock counts')).toBe(
      'Wanjiru has set a goal about the scheduling and the stock counts, and will talk it through with you.',
    );
  });
  it('falls back to "this part of the work" when there is no area', () => {
    expect(whatThePersonReadsAfterAWeek('Wanjiru', '')).toBe(
      'Wanjiru has set a goal about this part of the work, and will talk it through with you.',
    );
  });
});

/**
 * DECISION 56, ITEM 4, ON THE CONTEXT PAGE: after a week still not told, Tobi's own check-in page
 * reads it plainly - no number, no target wording, and who set it - instead of nothing at all.
 */
describe('a goal not told for a week (decision 56, item 4), on the Context page', () => {
  const AN_OLD_GOAL = 'Take over the scheduling and hit 40 stock counts by Friday.';
  const EIGHT_DAYS_AGO = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  const oldGoals = [
    { id: 'o-week', groundId: 'g1', participantId: 'p-tobi', text: AN_OLD_GOAL, kind: 'TODO', status: 'OPEN', authoredBy: 'lead', seenBySubject: false, awareness: 'NOT_TOLD', awarenessDetail: LEADS_NOTE, dueSaid: null, createdAt: EIGHT_DAYS_AGO, updatedAt: EIGHT_DAYS_AGO },
  ];

  function contextForWithOldGoal(userId: string) {
    const ground: any = {
      /* Fixed, not wall-clock: see the comment on contextFor's own ground above - a live new Date()
         rendered into the page text has previously carried its own minute into an unrelated
         assertion about the number 40, and failed only when the suite happened to run in minute
         :40. EIGHT_DAYS_AGO stays relative to Date.now(), which is what aWeekHasPassedSinceNotTold
         is actually testing here; nothing else needs to move with the clock. */
      id: 'g1', organizationId: 'org1', initiatorId: WANJIRU, createdAt: new Date('2026-09-20T09:00:00Z'), timelineDays: null,
      restrictExternalVisibility: true, peersVisibleToEachOther: true, whoSeesTargets: 'EVERYBODY',
      participants: people(), checkIns: [], resolution: null, patternDetections: [], objectives: [],
      report: { id: 'r1', releasedAt: new Date('2026-09-23T17:00:00Z'), sharedPicture: '', createdAt: new Date('2026-09-20T09:00:00Z') },
    };
    const prisma: any = {
      groundBaseline: { findFirst: jest.fn(async () => null) },
      personObjective: { findMany: jest.fn(async () => JSON.parse(JSON.stringify(oldGoals))) },
      ground: { findFirst: async () => ground, findUnique: async () => ground },
      user: { findUnique: jest.fn(async () => ({ role: role(userId), organizationId: 'org1' })) },
      groundParticipant: { findFirst: async () => null, findMany: async () => [] },
      organization: { findUnique: async () => ({ subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE', freeExtensionUsed: false }) },
      leadContextNote: { findMany: async () => [] },
      /* The worded area, already kept - see the-area-of-a-goal-is-worded-once.ts. */
      wordedLine: { findUnique: jest.fn(async () => ({ text: 'the scheduling and the stock counts' })) },
    };
    return new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, { respond: async () => '' } as any)
      .get('g1', 'org1', userId) as Promise<any>;
  }

  it('Tobi reads the worded area, plainly, never the raw sentence, never a number', async () => {
    const got = await text(contextForWithOldGoal(TOBI));
    expect(got).toContain('Wanjiru has set a goal about the scheduling and the stock counts, and will talk it through with you.');
    expect(got).not.toContain(AN_OLD_GOAL);
    expect(got).not.toContain(LEADS_NOTE);
    /* The number must not reach the reader in anything served. The served JSON also carries timestamps, whose minutes
       can be 40 whenever the suite runs in minute :40, so those are taken out first; every other place a 40 could be stays checked. */
    const withoutTimestamps = got.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g, '');
    expect(withoutTimestamps).not.toMatch(/\b40\b/);
    expect(got).not.toMatch(/\bhit\b/i);
  });

  it('Wanjiru, the lead, still reads the raw goal, in full', async () => {
    const got = await text(contextForWithOldGoal(WANJIRU));
    expect(got).toContain(AN_OLD_GOAL);
  });

  it('Baraka, a colleague, still reads nothing about it', async () => {
    const got = await text(contextForWithOldGoal(BARAKA));
    expect(got).not.toMatch(/scheduling|stock counts/i);
  });
});
