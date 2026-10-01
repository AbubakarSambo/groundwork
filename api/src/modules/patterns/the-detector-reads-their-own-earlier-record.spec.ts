/**
 * The detector is given the person's OWN earlier record for the codes that only show over time,
 * the same text on all five reads, never a colleague's words, and no code is lost (30 Sep 2026).
 */
import { PatternsService } from './patterns.service';
import { theirOwnEarlierRecord, earlierRecordQuery, MOST_EARLIER_LINES } from './the-detector-reads-their-own-earlier-record';
import { PATTERN_DETECTION_PROMPT, BAD_FAITH_CODES, POSITIVE_CODES, CARRYING_CODES, WHAT_COUNTS_BY_CODE } from './pattern-library';

const line = (type: string, text: string, sessionNumber: number, at = 0) => ({
  type, text, createdAt: new Date(2026, 8, 1, 0, at),
  checkIn: { sessionNumber, completedAt: null, startedAt: null, createdAt: new Date(2026, 8, sessionNumber), ground: { cadence: 'WEEKLY' } },
});

describe('theirOwnEarlierRecord', () => {
  it('says what they recorded in the last two periods, in plain lines with the period number', () => {
    const text = theirOwnEarlierRecord([
      line('WORRY', 'The supplier contract is still unsigned.', 4),
      line('COMMITMENT', 'I will chase legal by Friday.', 3),
      line('PROGRESS', 'Old work from long ago.', 1),
    ], 5);
    expect(text).toContain('- Period 4. Raised as a worry or problem: The supplier contract is still unsigned.');
    expect(text).toContain('- Period 3. Promised: I will chase legal by Friday.');
    expect(text).not.toContain('Old work from long ago');
  });
  it('is empty when there is no earlier record, and ignores this period and later ones', () => {
    expect(theirOwnEarlierRecord([], 3)).toBe('');
    expect(theirOwnEarlierRecord([line('WORRY', 'Same period.', 3)], 3)).toBe('');
  });
  it('is capped', () => {
    const many = Array.from({ length: 80 }, (_, i) => line('PROGRESS', `Done thing ${i}`, 4, i));
    expect(theirOwnEarlierRecord(many, 5).split('\n').filter((l) => l.startsWith('- ')).length).toBe(MOST_EARLIER_LINES);
  });
  it('asks only for this person\'s own, undisputed lines', () => {
    const q: any = earlierRecordQuery('p1', 5);
    expect(q.where.participantId).toBe('p1');
    expect(q.where.disputedAt).toBeNull();
  });
});

describe('the detection input', () => {
  function build(ownLines: any[]) {
    const prisma: any = {
      checkIn: {
        findUnique: jest.fn(async () => ({ id: 'c', groundId: 'g', participantId: 'p1', sessionNumber: 5, patternsAnalyzedAt: null, specificityDimensions: null, completedAt: new Date('2026-09-01'), startedAt: null, createdAt: new Date('2026-09-01'), ground: { cadence: 'WEEKLY' } })),
        update: jest.fn(async () => ({})),
      },
      conversationTurn: { findMany: jest.fn(async () => [{ role: 'PERSON', content: 'Still waiting on the contract.', createdAt: new Date() }]) },
      recordEntry: {
        /* A real database would honour the where; this one does, so a colleague's line never comes back for p1. */
        findMany: jest.fn(async (args: any) => (args?.where?.type?.in ? ownLines.filter((l) => l.participantId === args.where.participantId) : [])),
      },
      patternDetection: { findMany: jest.fn(async () => []) },
      groundDependency: { findMany: jest.fn(async () => []) },
    };
    const anthropic: any = { extract: jest.fn(async () => ({ detections: [] })), respond: jest.fn(async () => 'YES') };
    const svc: any = new PatternsService(prisma, anthropic);
    svc.buildDetectionInputForParticipant = jest.fn(async () => ({ submissions: [] }));
    return { svc, anthropic };
  }

  it('carries the person\'s own earlier lines and never a colleague\'s, the same on all five reads', async () => {
    const { svc, anthropic } = build([
      { ...line('WORRY', 'The contract is still unsigned.', 4), participantId: 'p1' },
      { ...line('WORRY', 'Priya said the launch is slipping.', 4), participantId: 'colleague' },
    ]);
    await svc.analyzeCheckIn('c');
    const inputs = (anthropic.extract.mock.calls as any[]).map((c) => c[1][0].content);
    expect(inputs).toHaveLength(5);
    expect(new Set(inputs).size).toBe(1);
    expect(inputs[0]).toContain('The contract is still unsigned.');
    expect(inputs[0]).not.toContain('Priya');
  });

  it('still works with no earlier record', async () => {
    const { svc, anthropic } = build([]);
    await svc.analyzeCheckIn('c');
    expect((anthropic.extract.mock.calls as any[])[0][1][0].content).not.toContain('LAST TWO PERIODS');
  });
});

describe('the wavering codes got clearer lines and nothing was lost', () => {
  it('has every code in the prompt, all 49', () => {
    const every = [...BAD_FAITH_CODES, ...POSITIVE_CODES, ...CARRYING_CODES];
    expect(every.length).toBeGreaterThanOrEqual(49);
    for (const c of every) expect(PATTERN_DETECTION_PROMPT).toContain(`- ${c.code} (${c.name}): ${c.signal}`);
  });
  it('says what counts for each wavering code, after its unchanged signal', () => {
    for (const code of ['B11', 'E2', 'K3', 'K5', 'F2', 'B9', 'K2', 'C1', 'B5', 'B2', 'B6', 'K4', 'D4', 'A2', 'R2', 'B1']) {
      expect(WHAT_COUNTS_BY_CODE[code]).toBeTruthy();
      expect(PATTERN_DETECTION_PROMPT).toContain(WHAT_COUNTS_BY_CODE[code]);
    }
    expect(WHAT_COUNTS_BY_CODE.K3).toMatch(/earlier record shows that/);
  });
});
