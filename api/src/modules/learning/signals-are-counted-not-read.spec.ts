import { Prisma } from '@prisma/client';
import { countPatterns, countSteps, countProbes, addCounts, probeSourcesOffered, splitTallyKey, type PatternFact } from './how-signals-are-counted';
import { suggestWeight, MIN_SIGNALS_BEFORE_A_WEIGHT_MOVES } from './a-suggested-weight';
import { LearningService, EVERYONE } from './learning.service';

const pat = (o: Partial<PatternFact> = {}): PatternFact => ({ code: 'M1', leadMark: null, personAnswered: false, reachedTheLead: true, talkedAbout: false, talkedAboutAtPeriod: null, lastSeenPeriod: 3, latestPeriodCompleted: 3, ...o });

describe('the three signals are counted from what the record holds', () => {
  it('a pattern counts the lead marks, the person answering, the talk, and whether it came back', () => {
    const t = countPatterns([
      pat({ leadMark: 'RIGHT', personAnswered: true, talkedAbout: true, talkedAboutAtPeriod: 3, lastSeenPeriod: 3, latestPeriodCompleted: 5 }),
      pat({ leadMark: 'WRONG', talkedAbout: true, talkedAboutAtPeriod: 3, lastSeenPeriod: 5, latestPeriodCompleted: 5 }),
      pat({ leadMark: 'NOT_SURE' }),
      pat({ reachedTheLead: false }),
      pat({ talkedAbout: true, talkedAboutAtPeriod: 3, lastSeenPeriod: 3, latestPeriodCompleted: 3 }), // no later period yet: not judged
    ]);
    const c = t.get('PATTERN\u0000M1')!;
    expect(c).toMatchObject({ judged: 3, goodCount: 1, badCount: 1, unsureCount: 1, answeredCount: 1, talkDue: 4, talkHappened: 3, changeJudged: 2, changedCount: 1 });
  });

  it('a coaching step counts its recorded outcome, and only a step asked about has had a conversation', () => {
    const t = countSteps([
      { step: 'Say what you tried next.', outcome: 'done' },
      { step: 'Say what you tried next.', outcome: 'did more' },
      { step: 'Say what you tried next.', outcome: 'not done' },
      { step: 'Say what you tried next.', outcome: 'sideways' },
      { step: 'Say what you tried next.', outcome: null },
      { step: '  ', outcome: 'done' },
    ]);
    expect(t.size).toBe(1);
    expect(t.get('COACHING_STEP\u0000Say what you tried next.')).toMatchObject({ judged: 4, goodCount: 2, badCount: 1, unsureCount: 1, talkDue: 5, talkHappened: 4, changeJudged: 4, changedCount: 2 });
  });

  it('a probe source counts how specific the answers were in sessions it was given to work from', () => {
    const t = countProbes([
      { sources: ['situation:PERFORMANCE', 'role:ENGINEERING'], specificity: 'specific' },
      { sources: ['situation:PERFORMANCE'], specificity: 'vague' },
      { sources: ['situation:PERFORMANCE', 'situation:PERFORMANCE'], specificity: 'directional' },
      { sources: ['situation:PERFORMANCE'], specificity: null },
    ]);
    expect(t.get('PROBE\u0000situation:PERFORMANCE')).toMatchObject({ judged: 3, goodCount: 1, badCount: 1, unsureCount: 1 });
    expect(t.get('PROBE\u0000role:ENGINEERING')).toMatchObject({ judged: 1, goodCount: 1 });
  });

  it('totals add the organisations together', () => {
    const a = countPatterns([pat({ leadMark: 'RIGHT' })]).get('PATTERN\u0000M1')!;
    expect(addCounts(a, a)).toMatchObject({ judged: 2, goodCount: 2 });
  });

  it('the keys a check-in was given questions from are plain keys', () => {
    expect(probeSourcesOffered({ scenario: 'PERFORMANCE', detectedFunction: 'ENGINEERING', roleHasNeutralQuestions: true, patternCodesWithAQuestion: ['D1'] })).toEqual(['situation:PERFORMANCE', 'role:ENGINEERING', 'pattern:D1']);
    expect(probeSourcesOffered({ scenario: null, detectedFunction: 'ENGINEERING', roleHasNeutralQuestions: false, patternCodesWithAQuestion: [] })).toEqual([]);
  });
});

describe('a suggested weight', () => {
  it('stays neutral until there are enough signals, and the minimum is said', () => {
    expect(MIN_SIGNALS_BEFORE_A_WEIGHT_MOVES).toBe(10);
    expect(suggestWeight({ judged: 9, goodCount: 0, unsureCount: 0 })).toEqual({ weight: 1, moved: false });
  });
  it('a pattern often marked wrong goes lower, one often marked right goes higher', () => {
    expect(suggestWeight({ judged: 10, goodCount: 1, unsureCount: 0 }).weight).toBeLessThan(1);
    expect(suggestWeight({ judged: 10, goodCount: 9, unsureCount: 0 }).weight).toBeGreaterThan(1);
    expect(suggestWeight({ judged: 10, goodCount: 5, unsureCount: 0 })).toEqual({ weight: 1, moved: true });
    expect(suggestWeight({ judged: 100, goodCount: 100, unsureCount: 0 }).weight).toBe(1.5);
    expect(suggestWeight({ judged: 100, goodCount: 0, unsureCount: 0 }).weight).toBe(0.5);
  });
});

describe('what is stored holds counts only', () => {
  it('the table has no person, name, words or answer column', () => {
    const fields = Object.values(Prisma.LearningSignalCountScalarFieldEnum) as string[];
    expect(fields.length).toBeGreaterThan(5);
    for (const f of fields) expect(f).not.toMatch(/person|participant|user|name|email|text|words|said|answer$|content|note|lead(?!s)/i);
  });

  it('counting from rows that carry names and words writes none of them, and the total is built from organisation rows alone', async () => {
    const SECRET = 'Zainab said the deploy was Tunde\'s fault';
    const writes: any[] = [];
    const prisma: any = {
      patternDetection: { findMany: jest.fn().mockResolvedValue([{ code: 'M1', participantId: 'p-zainab', leadMark: 'RIGHT', personAnsweredAt: new Date(), personAnswer: SECRET, observationText: SECRET, readyAt: new Date(), talkedAboutAt: null, talkedAboutAtPeriod: null, seenInSessions: [1, 2, 3] }]) },
      checkIn: {
        groupBy: jest.fn().mockResolvedValue([{ participantId: 'p-zainab', _max: { sessionNumber: 3 } }]),
        findMany: jest.fn().mockResolvedValue([{ probeSources: ['situation:PERFORMANCE'], specificityLevel: 'specific' }]),
      },
      coachingState: { findMany: jest.fn().mockResolvedValue([{ history: [{ step: 'Say what you tried next.', givenAtSession: 1, outcome: 'done' }] }]) },
      learningSignalCount: {
        upsert: jest.fn(async (a: any) => { writes.push(a); }),
        findMany: jest.fn(async (a: any) => (a.where.scope?.not === EVERYONE ? writes.filter((w) => w.where.scope_kind_key.scope !== EVERYONE).map((w) => ({ scope: w.where.scope_kind_key.scope, ...w.create })) : [])),
        deleteMany: jest.fn(),
      },
    };
    await new LearningService(prisma).recountOrganisation('org-1');
    const all = JSON.stringify(writes);
    for (const bad of ['Zainab', 'Tunde', 'deploy', 'p-zainab']) expect(all).not.toContain(bad);
    expect(writes.some((w) => w.create.scope === 'org-1' && w.create.kind === 'PATTERN')).toBe(true);
    expect(writes.some((w) => w.create.scope === EVERYONE && w.create.kind === 'COACHING_STEP')).toBe(true);
    // The patterns' words are never even selected.
    const sel = prisma.patternDetection.findMany.mock.calls[0][0].select;
    expect(sel.personAnswer).toBeUndefined();
    expect(sel.observationText).toBeUndefined();
    expect(splitTallyKey('PATTERN\u0000M1')).toEqual({ kind: 'PATTERN', key: 'M1' });
  });
});
