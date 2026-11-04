import { ReportsService } from './reports.service';
import { GroundMode, GroundScenario, PartyType } from '@prisma/client';

/**
 * DECISION 139, ITEM 1 (building on decision 58): AN ADMIN WHO ONLY READS A CHECK-IN IS NEVER SERVED THE
 * LEAD'S JUDGEMENT, OR A PATTERN.
 *
 * Read in the final evaluation (11 October 2026, profiles 2, 3 and 5). Grace, the managing director, an
 * admin who neither ran those check-ins nor set them up, was served on the report
 * "theJudgement.theGap: Wairimu Njoroge believes the catalogue is finished ...", and on the board's coaching
 * "Presents well, delivers late, more than once. On record across 3 sessions. Worth asking: ...".
 *
 * Read here as the real readers. Tunde runs "Atlas delivery"; Femi takes part; Grace is an admin of the
 * organisation who only reads; Adaeze is the admin who set it up for Tunde (decision 58's one grant).
 * The board's coaching is read exactly as the board asks for it: `coachingForTheBoard` with `adminReadsIt`
 * true for an admin with access (board.service.ts, decision 93).
 */
const THE_GAP = 'Femi Okonkwo describes the Harbor Foods deal as his own; the pricing came from somebody else.';
let SET_UP_BY = 'u-tunde';
const PATTERN_LINE = 'Others describe doing work they described as theirs';

const LEAD = { id: 'p-lead', userId: 'u-tunde', partyType: PartyType.INITIATOR, email: 't@meridian.test', roleAsDescribed: 'runs Atlas', nameGiven: null, organisationGiven: null, managingOnly: true, createdAt: new Date('2026-09-01T09:00:00Z'), user: { firstName: 'Tunde', lastName: 'Bakare' } };
const FEMI = { id: 'p-femi', userId: 'u-femi', partyType: PartyType.PARTICIPANT, email: 'f@meridian.test', roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null, managingOnly: false, createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: 'Femi', lastName: 'Okonkwo' } };
const PEOPLE = [LEAD, FEMI];

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY);

const CHECK_INS = [1, 2, 3].map((n) => ({ id: `f${n}`, participantId: 'p-femi', sessionNumber: n, status: 'COMPLETED', isSetup: false, completedAt: new Date(`2026-09-0${n + 1}T16:00:00Z`) }));

const FEMI_SAID = 'Femi described the Harbor Foods deal as his own although Ngozi prepared the pricing.';

/* B3, three periods, shown four days ago and never answered: the lead may read it (decision 39). */
const PATTERN_ROWS = [
  { id: 'pd2', groundId: 'g-atlas', participantId: 'p-femi', code: 'B3', status: 'SURFACED', observationText: FEMI_SAID, periodsObserved: 3, seenInSessions: [1, 2, 3], readyAt: ago(5), shownToPersonAt: ago(4), personAnswer: null, personAnsweredAt: null, lastSeenAt: ago(4), createdAt: ago(30) },
];

const GROUND: any = {
  id: 'g-atlas', scenario: GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED, status: 'ACTIVE',
  initiatorId: 'u-tunde', createdByUserId: 'u-tunde', organizationId: 'org-1',
  peopleWorkTogether: true, peersVisibleToEachOther: true, timelineDays: 90, cadence: 'WEEKLY',
  whoSeesTargets: 'EVERYBODY', label: 'Atlas delivery',
  participants: PEOPLE, checkIns: CHECK_INS,
  report: {
    id: 'r1', groundId: 'g-atlas', releasedAt: new Date('2026-09-04T17:00:00Z'), sharedAs: null, theOpening: null, networkPicture: null,
    sharedPicture: 'Both have checked in three times.', agreements: [], divergences: [], centralQuestion: '', engagement: {},
    theJudgement: { theGap: THE_GAP, whatToDo: [{ move: 'Ask Femi Okonkwo to show the pricing he prepared.', because: 'Two accounts of the same deal differ.', startWith: 'Femi Okonkwo' }] },
    createdAt: new Date('2026-09-02T09:00:00Z'), updatedAt: new Date('2026-09-04T17:00:00Z'),
  },
  objectives: [], dependencies: [], poll: null,
};

const copy = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

function prismaFor(role: string) {
  const reads = {
    findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null), findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0), aggregate: jest.fn(async () => ({ _max: { sessionNumber: 3 } })),
  };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own, create: jest.fn(async () => ({})), update: jest.fn(async () => ({})), updateMany: jest.fn(async () => ({})), createMany: jest.fn(async () => ({})), upsert: jest.fn(async () => ({})) });
  return new Proxy({
    ground: model({ findUnique: jest.fn(async () => {
      const g = copy(GROUND); g.createdByUserId = SET_UP_BY;
      if (g.report) for (const k of ['releasedAt', 'createdAt', 'updatedAt']) if (g.report[k]) g.report[k] = new Date(g.report[k]);
      return g;
    }) }),
    user: model({ findUnique: jest.fn(async () => ({ role, organizationId: 'org-1', awaitingOrgApproval: false })), findFirst: jest.fn(async () => ({ id: 'u-grace' })) }),
    checkIn: model({ findMany: jest.fn(async () => copy(CHECK_INS)) }),
    patternDetection: model({ findMany: jest.fn(async () => copy(PATTERN_ROWS)) }),
    recordEntry: model({ findMany: jest.fn(async () => []) }),
    groundDependency: model({ findMany: jest.fn(async () => []) }),
    groundDocument: model({ findMany: jest.fn(async () => []) }),
    wordedLine: { findUnique: jest.fn(async () => null), upsert: jest.fn(async () => ({})) },
  } as any, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
}

const theModel: any = { respond: jest.fn(async () => null), extract: jest.fn(async () => { throw new Error('no model here'); }) };
const reportsFor = (role: string) => new ReportsService(
  prismaFor(role), {} as any, theModel, {} as any, { get: (k: string) => k === 'app.confidenceEnabled' } as any,
  { emit: async () => undefined } as any,
  { getSessionProgress: async () => ({ completed: 3, total: 3, missingParticipantIds: [], declinedParticipantIds: [] }) } as any,
  { tell: async () => [] } as any,
);


describe('the report, as each reader', () => {
  beforeEach(() => { SET_UP_BY = 'u-tunde'; });

  it('Tunde, who runs it, reads the judgement', async () => {
    const report: any = await reportsFor('MEMBER').get('g-atlas', 'u-tunde', 'org-1');
    expect(report.theJudgement?.theGap).toBe(THE_GAP);
  });

  it('Grace, an admin who only reads, is served no judgement, and no pattern', async () => {
    const report: any = await reportsFor('ADMIN').get('g-atlas', 'u-grace', 'org-1');
    expect(report.activated).toBe(true);
    expect(report.theJudgement).toBeUndefined();
    expect(JSON.stringify(report)).not.toContain(THE_GAP);
    expect(JSON.stringify(report)).not.toContain(PATTERN_LINE);
    /* What decision 5 gives her stays: the shared picture of the check-in. */
    expect(report.sharedPicture).toBe('Both have checked in three times.');
  });

  it('Adaeze, the admin who set it up for Tunde, reads the judgement (decision 58)', async () => {
    SET_UP_BY = 'u-adaeze';
    const report: any = await reportsFor('ADMIN').get('g-atlas', 'u-adaeze', 'org-1');
    expect(report.theJudgement?.theGap).toBe(THE_GAP);
  });

  it('Femi, who takes part, is served no judgement, as before', async () => {
    const report: any = await reportsFor('MEMBER').get('g-atlas', 'u-femi', 'org-1');
    expect(report.theJudgement).toBeUndefined();
  });
});

describe("the board's coaching, what to ask each person, as each reader", () => {
  beforeEach(() => { SET_UP_BY = 'u-tunde'; });

  it('Tunde reads what to ask Femi, and no line from Femi’s stored pattern', async () => {
    /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
    const coaching: any = await reportsFor('MEMBER').coachingForTheBoard('g-atlas', 'u-tunde');
    expect((coaching?.eachPerson ?? []).find((r: any) => r.participantId === 'p-femi')).toBeTruthy();
    const said = JSON.stringify(coaching);
    expect(said).not.toContain(PATTERN_LINE);
    expect(said).not.toMatch(/On record across \d+ sessions/);
  });

  it('Grace, an admin who only reads, still reads what to ask Femi (decision 93), but never the pattern line', async () => {
    const coaching: any = await reportsFor('ADMIN').coachingForTheBoard('g-atlas', 'u-grace', { adminReadsIt: true });
    const femi = (coaching?.eachPerson ?? []).find((r: any) => r.participantId === 'p-femi');
    expect(femi).toBeTruthy();
    const said = JSON.stringify(coaching);
    expect(said).not.toContain(PATTERN_LINE);
    expect(said).not.toMatch(/On record across \d+ sessions/);
  });

  it('Adaeze, who set it up, reads what to ask Femi, and no line from Femi’s stored pattern, as Tunde now does', async () => {
    /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
    SET_UP_BY = 'u-adaeze';
    const coaching: any = await reportsFor('ADMIN').coachingForTheBoard('g-atlas', 'u-adaeze', { adminReadsIt: true });
    expect((coaching?.eachPerson ?? []).find((r: any) => r.participantId === 'p-femi')).toBeTruthy();
    expect(JSON.stringify(coaching)).not.toContain(PATTERN_LINE);
  });
});
