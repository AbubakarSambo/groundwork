import { GroundMode, GroundScenario, PartyType } from '@prisma/client';
import { BAD_FAITH_CODES, CARRYING_CODES, POSITIVE_CODES } from '../patterns/pattern-library';
import { PATTERNS_ARE_SERVED } from '../patterns/patterns-are-served';

/**
 * NO BOARD, SERVED AS ANYBODY, CARRIES A PATTERN. Hafsah, 27 September 2026.
 *
 * The capability check read these on the live Atlas board: "Femi Okonkwo · Blame Shifting · Seen in
 * sessions 1, 2, 3 of 3" on the lead's, "You · Claimed Work Inflation" under "Seen once or twice, not
 * yet a pattern" after two sessions, and "Blame Shifting. The failure to secure approvals is
 * attributed entirely to the credit committee" on a colleague's own board, about Ngozi. Her words:
 * "stop serving patterns to every board, for everyone, until patterns are done properly".
 *
 * So this builds a real board through `BoardService.get`, with pattern rows in the database and a
 * stored record-over-time that still holds patterns and the question built from one, and reads the
 * whole served answer as every kind of reader: the lead, a participant, an organisation admin who is
 * not in the check-in, on a check-in where people see each other and on one where they do not, and
 * on a report shared named and one shared without names. None of it may hold a pattern's code, any
 * of the internal names from the catalogue, the engine's sentence, the library's signal or question,
 * or a field that exists only to carry a pattern.
 *
 * And it proves the fixture is not empty: with the switch turned on, the same board does carry them.
 */

const LEAD = {
  id: 'p-lead', userId: 'u-tunde', partyType: PartyType.INITIATOR, email: 't@meridian.test',
  roleAsDescribed: 'runs Atlas', nameGiven: null, organisationGiven: null, managingOnly: true,
  createdAt: new Date('2026-09-01T09:00:00Z'), user: { firstName: 'Tunde', lastName: 'Bakare' },
};
const NGOZI = {
  id: 'p-ngozi', userId: 'u-ngozi', partyType: PartyType.PARTICIPANT, email: 'n@meridian.test',
  roleAsDescribed: 'finance', nameGiven: null, organisationGiven: null, managingOnly: false,
  createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: 'Ngozi', lastName: 'Eke' },
};
const FEMI = {
  id: 'p-femi', userId: 'u-femi', partyType: PartyType.PARTICIPANT, email: 'f@meridian.test',
  roleAsDescribed: 'sales', nameGiven: null, organisationGiven: null, managingOnly: false,
  createdAt: new Date('2026-09-01T10:00:00Z'), user: { firstName: 'Femi', lastName: 'Okonkwo' },
};

const CHECK_INS = [1, 2, 3].flatMap((n) => [
  { id: `n${n}`, participantId: 'p-ngozi', sessionNumber: n, status: 'COMPLETED', isSetup: false, completedAt: new Date(`2026-09-0${n + 1}T16:00:00Z`) },
  { id: `f${n}`, participantId: 'p-femi', sessionNumber: n, status: 'COMPLETED', isSetup: false, completedAt: new Date(`2026-09-0${n + 1}T17:00:00Z`) },
]);

/* The engine's own sentences, which are what a reader would see beside the names. */
const NGOZI_SAID = 'The failure to secure approvals is attributed entirely to the credit committee not clearing submitted files.';
const FEMI_SAID = 'Femi described the Harbor Foods deal as his own although Ngozi prepared the pricing.';
const CANDIDATE_SAID = 'Named the new analyst as the reason the forecast was late in the second check-in.';

const DETECTIONS = [
  { id: 'pd1', participantId: 'p-ngozi', code: 'B11', status: 'SURFACED', observationText: NGOZI_SAID, periodsObserved: 3, seenInSessions: [1, 2, 3], lastPeriodNumber: 3, createdAt: new Date('2026-09-04T09:00:00Z'), lastSeenAt: new Date('2026-09-04T09:00:00Z'), readyAt: new Date('2026-09-04T09:00:00Z') },
  { id: 'pd2', participantId: 'p-femi', code: 'B3', status: 'SURFACED', observationText: FEMI_SAID, periodsObserved: 3, seenInSessions: [1, 2, 3], lastPeriodNumber: 3, createdAt: new Date('2026-09-04T09:00:00Z'), lastSeenAt: new Date('2026-09-04T09:00:00Z'), readyAt: new Date('2026-09-04T09:00:00Z') },
  { id: 'pd3', participantId: 'p-femi', code: 'R3', status: 'SURFACED', observationText: 'Femi credited Ngozi by name for the pricing sheet.', periodsObserved: 1, seenInSessions: [2], lastPeriodNumber: 2, createdAt: new Date('2026-09-03T09:00:00Z'), lastSeenAt: new Date('2026-09-03T09:00:00Z') },
  { id: 'pd4', participantId: 'p-ngozi', code: 'E1', status: 'CANDIDATE', observationText: CANDIDATE_SAID, periodsObserved: 1, seenInSessions: [2], lastPeriodNumber: 2, createdAt: new Date('2026-09-03T09:00:00Z'), lastSeenAt: new Date('2026-09-03T09:00:00Z') },
];

/* The record over time, as a report kept before the switch stored it: whole, patterns and all. */
const PATTERN_QUESTION = `${NGOZI_SAID} Seen in 3 sessions. Ask Ngozi Eke what they have changed about it since the first time.`;
const STORED_OVER_TIME = {
  sessions: 3,
  commitments: [],
  dependencies: [],
  patterns: [
    { participantId: 'p-ngozi', who: 'Ngozi Eke', code: 'B11', name: 'Blame Shifting', observation: NGOZI_SAID, seenInSessions: [1, 2, 3], consecutive: 3, status: 'SURFACED', say: 'Seen in sessions 1, 2, 3 of 3, consecutively. Enough sessions to be a pattern rather than an incident.' },
    { participantId: 'p-ngozi', who: 'Ngozi Eke', code: 'E1', name: 'Equity Without Contribution', observation: CANDIDATE_SAID, seenInSessions: [2], consecutive: 1, status: 'CANDIDATE', say: 'Seen in sessions 2 of 3. One or two sessions of something is not yet a pattern, and it is here so a reader can see what it was.' },
  ],
  gaps: [],
  stillOpen: [],
  cannotTellYou: ['Most of what anybody did is not in here. This is what was said in the sessions, and nothing else.'],
  toSettleFirst: [
    'Nothing here is backed by a document. Ask for one thing in writing that you could check yourself.',
    PATTERN_QUESTION,
  ],
};

function groundWith(o: { peersVisibleToEachOther: boolean; sharedAs: string | null; scenario?: GroundScenario }): any {
  return {
    id: 'g-atlas', scenario: o.scenario ?? GroundScenario.OKR_ALIGNMENT, mode: GroundMode.SHARED,
    initiatorId: 'u-tunde', createdByUserId: 'u-tunde', organizationId: 'org-1',
    peopleWorkTogether: true, peersVisibleToEachOther: o.peersVisibleToEachOther, timelineDays: 90, cadence: 'WEEKLY',
    whoSeesTargets: 'THEIR_OWN', label: 'Atlas delivery',
    participants: [LEAD, NGOZI, FEMI],
    checkIns: CHECK_INS,
    report: {
      releasedAt: new Date('2026-09-04T17:00:00Z'), sharedAs: o.sharedAs, theOpening: null, networkPicture: null,
      sharedPicture: 'Both have checked in three times.', agreements: [], divergences: [], centralQuestion: null,
      engagement: {}, findings: [],
      overTime: STORED_OVER_TIME,
      createdAt: new Date('2026-09-02T09:00:00Z'), updatedAt: new Date('2026-09-04T17:00:00Z'),
    },
    objectives: [],
    dependencies: [],
    poll: null,
  };
}

function boardFor(
  mods: { BoardService: any; ReportsService: any },
  requestingUserId: string,
  viewerRole: string,
  ground: any,
) {
  const reads = {
    findMany: jest.fn(async () => []),
    findFirst: jest.fn(async () => null),
    findUnique: jest.fn(async () => null),
    count: jest.fn(async () => 0),
    aggregate: jest.fn(async () => ({ _max: { sessionNumber: 3 } })),
  };
  const model = (own: Record<string, any> = {}) => ({ ...reads, ...own });
  const prisma: any = new Proxy({
    ground: model({ findUnique: jest.fn(async () => JSON.parse(JSON.stringify(ground))) }),
    user: model({ findUnique: jest.fn(async () => ({ role: viewerRole, organizationId: 'org-1' })) }),
    checkIn: model({ findMany: jest.fn(async () => JSON.parse(JSON.stringify(CHECK_INS))) }),
    patternDetection: model({
      findMany: jest.fn(async (args: any) => DETECTIONS.filter((d) =>
        (!args?.where?.status || d.status === args.where.status)
        && (!args?.where?.groundId || args.where.groundId === 'g-atlas'))),
      count: jest.fn(async () => DETECTIONS.length),
    }),
  }, {
    get(target: any, prop: string) {
      if (!(prop in target) && typeof prop === 'string' && !prop.startsWith('$')) target[prop] = model();
      return target[prop];
    },
  });
  const reports = Object.create(mods.ReportsService.prototype);
  const svc = new mods.BoardService(prisma, { respond: jest.fn(async () => null) } as any, { getSessionProgress: async () => null } as any, reports);
  return svc.get('g-atlas', requestingUserId, undefined) as Promise<any>;
}

const READERS: [string, string, string][] = [
  ['the lead', 'u-tunde', 'MEMBER'],
  ['a participant the patterns are about', 'u-ngozi', 'MEMBER'],
  ['a participant reading a colleague', 'u-femi', 'MEMBER'],
  ['an organisation admin who is not in the check-in', 'u-admin', 'ADMIN'],
];
const GROUNDS: [string, { peersVisibleToEachOther: boolean; sharedAs: string | null; scenario?: GroundScenario }][] = [
  ['people see each other, report shared named', { peersVisibleToEachOther: true, sharedAs: null }],
  ['people see each other, report shared without names', { peersVisibleToEachOther: true, sharedAs: 'ANONYMOUS' }],
  ['people see only themselves, on a delivery check-in', { peersVisibleToEachOther: false, sharedAs: null }],
  ['people see only themselves, on a cohort', { peersVisibleToEachOther: false, sharedAs: null, scenario: GroundScenario.COHORT_CHECK }],
];

const CATALOGUE = [...POSITIVE_CODES, ...CARRYING_CODES, ...BAD_FAITH_CODES];

/** Every way a pattern could be in what was served, as the reasons it is. */
function whatOfAPatternIsIn(board: any): string[] {
  const served = JSON.stringify(board);
  const found: string[] = [];
  for (const c of CATALOGUE) {
    if (served.includes(c.name)) found.push(`the internal name "${c.name}"`);
    if (served.includes(c.signal)) found.push(`the signal of ${c.code}`);
    if (c.probe && served.includes(c.probe)) found.push(`the question for ${c.code}`);
    if (served.includes(`"${c.code}"`)) found.push(`the code ${c.code}`);
  }
  for (const d of DETECTIONS) if (served.includes(d.observationText)) found.push(`the observation for ${d.code}`);
  if ('patterns' in board) found.push('a "patterns" section');
  if ((board.sections ?? []).includes('patterns')) found.push('"patterns" in the sections the page is told to draw');
  if (board.overTime?.patterns?.length) found.push('patterns in the record over time');
  if ((board.overTime?.toSettleFirst ?? []).some((q: string) => q.includes('what they have changed about it since the first time'))) found.push('a question built from a pattern');
  for (const key of ['askThem', 'periodsObserved', 'seenInSessions']) if (served.includes(`"${key}"`)) found.push(`the field ${key}`);
  if (/not yet a pattern|to be a pattern rather than an incident/.test(served)) found.push('a sentence about a pattern');
  return found;
}

const real = () => ({
  BoardService: require('./board.service').BoardService,
  ReportsService: require('../reports/reports.service').ReportsService,
});

/*
 * Decision 52 (29 September 2026) approved the plain names and turned PATTERNS_ARE_SERVED on for
 * real, so the "off" behaviour below is no longer what the live constant reads. It is still a rule
 * worth keeping - the same code must serve no pattern at all when the switch is off - so this block
 * now mocks the constant to false instead of relying on it being false for real. This is the same
 * reason and the same mocking style the "switch on" block below already used the other way round.
 */
describe('no board carries a pattern while patterns are not served', () => {
  function realWithSwitchOff() {
    let mods: any;
    jest.isolateModules(() => {
      jest.doMock('../patterns/patterns-are-served', () => ({ PATTERNS_ARE_SERVED: false }));
      mods = real();
    });
    return mods;
  }

  afterEach(() => jest.dontMock('../patterns/patterns-are-served'));

  for (const [groundIs, shape] of GROUNDS) {
    for (const [reader, userId, role] of READERS) {
      it(`as ${reader}, when ${groundIs}`, async () => {
        const board = await boardFor(realWithSwitchOff(), userId, role, groundWith(shape));
        expect(board.renders).toBe(true);
        expect(whatOfAPatternIsIn(board)).toEqual([]);
      });
    }
  }

  it('and the lead still reads the rest of the record over time', async () => {
    const board = await boardFor(realWithSwitchOff(), 'u-tunde', 'MEMBER', groundWith(GROUNDS[0][1]));
    expect(board.overTime.toSettleFirst).toEqual(['Nothing here is backed by a document. Ask for one thing in writing that you could check yourself.']);
    expect(board.overTime.cannotTellYou).toEqual(STORED_OVER_TIME.cannotTellYou);
  });
});

describe('the live switch, since decision 52', () => {
  it('is on: patterns are served under the rules', () => {
    expect(PATTERNS_ARE_SERVED).toBe(true);
  });
});

/*
 * WITH THE SWITCH ON, UNDER THE RULES. This used to prove the fixture was not empty by finding the
 * internal name "Blame Shifting" and the question built from a pattern on the lead's board with the
 * switch on, which was the old defect. The switch now means "serve patterns under Hafsah's rules"
 * (patterns/who-reads-a-pattern), so with it on the lead's board has a pattern section, in plain
 * words, and still no internal name, no code and nothing from the stored record over time.
 */
describe('and the fixture is not empty: with the switch on, the board serves them under the rules', () => {
  it('Ngozi’s own board carries her pattern section in plain words; the lead’s carries nothing of any stored pattern', async () => {
    /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
    /* The switch is on for real since decision 52, so this reads the live constant, not a mock. */
    const ngozis = await boardFor(real(), 'u-ngozi', 'MEMBER', groundWith(GROUNDS[0][1]));
    const hers = whatOfAPatternIsIn(ngozis);
    expect(hers).toContain('a "patterns" section');
    expect(ngozis.patterns.map((p: any) => p.heading)).toContain('Problems are mostly put down to things outside the team');
    expect(hers.filter((f) => f.startsWith('the internal name') || f.startsWith('the code'))).toEqual([]);
    expect(hers).not.toContain('patterns in the record over time');
    expect(hers).not.toContain('a question built from a pattern');
    const lead = await boardFor(real(), 'u-tunde', 'MEMBER', groundWith(GROUNDS[0][1]));
    expect(lead.renders).toBe(true);
    /* The section may be drawn for the record layer, but nothing in it comes from a stored row. */
    expect(whatOfAPatternIsIn(lead).filter((f) => f !== 'a "patterns" section' && !f.startsWith('"patterns" in the sections'))).toEqual([]);
    expect((lead.patterns ?? []).map((p: any) => p.heading)).not.toContain('Problems are mostly put down to things outside the team');
    expect((lead.patterns ?? []).map((p: any) => p.heading)).not.toContain('Others describe doing work they described as theirs');
  });
});

describe('and the report serves the record over time the same way', () => {
  it('the lead’s report reads no pattern and no question built from one; a participant’s reads none either', () => {
    const { overTimeForThisReader } = require('../reports/what-the-record-shows-over-time');
    for (const viewer of [{ isLead: true, participantId: 'p-lead' }, { isLead: false, participantId: 'p-ngozi' }]) {
      const served = overTimeForThisReader(STORED_OVER_TIME, viewer);
      expect(served.patterns).toEqual([]);
      expect(served.toSettleFirst.filter((q: string) => q === PATTERN_QUESTION)).toEqual([]);
      expect(JSON.stringify(served)).not.toMatch(/Blame Shifting|Equity Without Contribution|not yet a pattern/);
    }
  });
});

/*
 * DECISION 86 REVERSES DECISION 74, ITEM 2. This block was "with the person-only reach, the lead's
 * board carries no pattern". There is no such reach now: with nothing put in force, the lead's board
 * carries Ngozi's pattern after her turn, and Ngozi's own board carries hers, telling her Tunde reads it.
 */
describe('with no setting at all, the lead’s board carries no stored pattern and Ngozi’s carries hers (decision 86, then Hafsah, 2 November 2026)', () => {
  it('the lead’s board has none of Ngozi’s stored pattern, in any words', async () => {
    /* Hafsah, 2 November 2026: the lead reads the assessment's pattern layer, not stored patterns. */
    const board = await boardFor(real(), 'u-tunde', 'MEMBER', groundWith(GROUNDS[0][1]));
    expect((board.patterns ?? []).map((p: any) => p.heading)).not.toContain('Problems are mostly put down to things outside the team');
    expect(JSON.stringify(board)).not.toContain(NGOZI_SAID);
    expect(whatOfAPatternIsIn(board).filter((f) => f.startsWith('the internal name') || f.startsWith('the code'))).toEqual([]);
  });

  it('Ngozi’s own board carries hers, in plain words, with no note under it', async () => {
    const board = await boardFor(real(), 'u-ngozi', 'MEMBER', groundWith(GROUNDS[0][1]));
    expect((board.patterns ?? []).map((p: any) => p.heading)).toContain('Problems are mostly put down to things outside the team');
    expect((board.patterns ?? []).every((p: any) => p.yours)).toBe(true);
/* Hafsah, 2 November 2026: only the person reads a stored pattern now, so they are told only they see it. */
    /* Changed 3 November: the note under a person's own pattern was removed on purpose in 23a41f190; who may read it is unchanged. */
    expect((board.patterns ?? []).every((p: any) => p.whoSeesIt === undefined)).toBe(true);
  });
});
