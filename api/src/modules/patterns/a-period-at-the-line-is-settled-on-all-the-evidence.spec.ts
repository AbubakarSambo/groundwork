/**
 * A PERIOD THE READS WERE SPLIT ON IS SETTLED ONCE, ON MORE OF THE SAME EVIDENCE (decision 68).
 *
 * The pure rules first, then analyzeCheckIn with a stand-in model: a split period (two or three of
 * five reads) on a pattern not yet shown brings five more reads and is decided on all ten, either
 * way, by majority (a tie going the way the first five went); a period the reads agreed on brings no extra reads; a pattern already shown
 * brings none; and when the extra reads do not come back, three of five decides, as before.
 */
import { PatternsService } from './patterns.service';
import {
  theReadsWereSplit,
  couldChangeWhatIsShown,
  holdsOnAllTheReads,
  votesOf,
  whatCountsThisPeriod,
  MORE_READS_WHEN_SPLIT,
  whatTheSettlingLetGo,
} from './a-period-at-the-line-is-settled-on-all-the-evidence';

describe('which periods are settled', () => {
  it('two or three of five reads is split; none, one, four or five is not', () => {
    expect([0, 1, 2, 3, 4, 5].map((n) => theReadsWereSplit(n, 3))).toEqual([false, false, true, true, false, false]);
  });

  it('only while the pattern is counted in fewer than three periods before this one', () => {
    expect(couldChangeWhatIsShown([], 1, 3)).toBe(true);
    expect(couldChangeWhatIsShown([1, 2], 3, 3)).toBe(true);
    expect(couldChangeWhatIsShown([1, 2, 4], 5, 3)).toBe(false);
  });
});

describe('the line on all the reads is still a majority', () => {
  it('six of ten holds and four of ten does not, whatever the first five said', () => {
    expect(holdsOnAllTheReads(6, 10, 2, 3)).toBe(true);
    expect(holdsOnAllTheReads(4, 10, 3, 3)).toBe(false);
  });

  it('five of ten is a tie, and goes the way the first five went', () => {
    expect(holdsOnAllTheReads(5, 10, 3, 3)).toBe(true);
    expect(holdsOnAllTheReads(5, 10, 2, 3)).toBe(false);
  });

  it('with only some extra reads back, more than half of what came back decides', () => {
    expect(holdsOnAllTheReads(5, 8, 2, 3)).toBe(true);
    expect(holdsOnAllTheReads(3, 8, 3, 3)).toBe(false);
    expect(holdsOnAllTheReads(0, 0, 3, 3)).toBe(false);
  });
});

const keeps = (code: string, n: number, of: number, label = 'read') =>
  Array.from({ length: of }, (_, i) => (i < n ? [{ code, observation: `${label} ${i + 1}: the freezer supplier has still not called back.` }] : []));

describe('whatCountsThisPeriod', () => {
  const always = () => true;

  it('a split code is decided on all the reads, either way', () => {
    expect(whatCountsThisPeriod(keeps('K3', 2, 5), keeps('K3', 4, 5), always, 3).has('K3')).toBe(true);
    expect(whatCountsThisPeriod(keeps('K3', 3, 5), keeps('K3', 1, 5), always, 3).has('K3')).toBe(false);
  });

  it('a tie on ten reads goes the way the first five went', () => {
    expect(whatCountsThisPeriod(keeps('K3', 3, 5), keeps('K3', 2, 5), always, 3).has('K3')).toBe(true);
    expect(whatCountsThisPeriod(keeps('K3', 2, 5), keeps('K3', 3, 5), always, 3).has('K3')).toBe(false);
  });

  it('a code the first reads agreed on is decided on them alone, whatever the extra reads say', () => {
    const first = keeps('K3', 4, 5);
    const counted = whatCountsThisPeriod(first, keeps('K3', 0, 5), (_c, n) => theReadsWereSplit(n, 3), 3);
    expect(counted.get('K3')?.settled).toBe(false);
    expect(counted.has('K3')).toBe(true);
  });

  it('with no extra reads, three of five decides as before', () => {
    expect(whatCountsThisPeriod(keeps('K3', 3, 5), [], always, 3).has('K3')).toBe(true);
    expect(whatCountsThisPeriod(keeps('K3', 2, 5), [], always, 3).has('K3')).toBe(false);
  });

  it('keeps the observation of the first of the first reads that kept it', () => {
    expect(whatCountsThisPeriod(keeps('K3', 2, 5, 'first'), keeps('K3', 5, 5, 'more'), always, 3).get('K3')?.observation).toContain('first 1:');
  });

  it('whatTheSettlingLetGo names only codes three of the first five kept that the ten reads did not', () => {
    expect(whatTheSettlingLetGo(keeps('K3', 3, 5), keeps('K3', 1, 5), always, 3)).toEqual([{ code: 'K3', firstVotes: 3, votes: 4, reads: 10 }]);
    expect(whatTheSettlingLetGo(keeps('K3', 2, 5), keeps('K3', 1, 5), always, 3)).toEqual([]);
    expect(whatTheSettlingLetGo(keeps('K3', 3, 5), keeps('K3', 3, 5), always, 3)).toEqual([]);
    expect(whatTheSettlingLetGo(keeps('K3', 3, 5), [], always, 3)).toEqual([]);
  });

  it('votesOf gives one vote per read even if a read names a code twice', () => {
    const v = votesOf([[{ code: 'K3', observation: 'a' }, { code: 'K3', observation: 'b' }], [{ code: 'K3', observation: 'c' }]]);
    expect(v.get('K3')).toEqual({ count: 2, observation: 'a' });
  });
});

describe('analyzeCheckIn settles a split period on five more reads', () => {
  function buildPrisma(countedBefore: number[] = []) {
    return {
      checkIn: {
        findUnique: jest.fn(async () => ({
          id: 'check-1', groundId: 'g1', participantId: 'p1', sessionNumber: 4,
          patternsAnalyzedAt: null, specificityDimensions: null,
          completedAt: new Date('2026-09-01'), startedAt: null, createdAt: new Date('2026-09-01'),
          ground: { cadence: 'WEEKLY' },
        })),
        update: jest.fn(async () => ({})),
      },
      conversationTurn: {
        findMany: jest.fn(async () => [{ role: 'PERSON', content: 'The supplier still has not called back about the freezers.', createdAt: new Date('2026-09-01') }]),
      },
      recordEntry: { findMany: jest.fn(async () => [] as any[]) },
      patternDetection: {
        findMany: jest.fn(async (args: any) =>
          args?.select?.seenInSessions && countedBefore.length ? [{ code: 'K3', seenInSessions: countedBefore }] : []),
      },
      groundDependency: { findMany: jest.fn(async () => [] as any[]) },
    };
  }

  /** The first five reads keep K3 `keptOn` times; of any more reads, `moreKeptOn` keep it ('fail' throws). */
  function buildModel(keptOn: number, moreKeptOn: number | 'fail') {
    let read = 0;
    return {
      extract: jest.fn(async () => {
        read += 1;
        if (read > 5 && moreKeptOn === 'fail') throw new Error('model unreachable');
        const keep = read <= 5 ? read <= keptOn : read - 5 <= (moreKeptOn as number);
        return { detections: keep ? [{ code: 'K3', observation: `read ${read}: the freezer supplier was chased again and has still not called back.` }] : [] };
      }),
      respond: jest.fn(async () => 'YES'),
    };
  }

  async function run(keptOn: number, moreKeptOn: number | 'fail', countedBefore: number[] = []) {
    const prisma = buildPrisma(countedBefore);
    const model = buildModel(keptOn, moreKeptOn);
    const svc: any = new PatternsService(prisma as any, model as any);
    svc.buildDetectionInputForParticipant = jest.fn(async () => ({ submissions: [] }));
    const written: string[] = [];
    svc.observe = jest.fn(async (_g: string, _p: string, code: string) => { written.push(code); });
    svc.observePositive = jest.fn(async (_g: string, _p: string, code: string) => { written.push(code); });
    const lines: string[] = [];
    jest.spyOn(svc.logger, 'log').mockImplementation((m: any) => { lines.push(String(m)); });
    await svc.analyzeCheckIn('check-1');
    return { written, reads: model.extract.mock.calls.length, lines };
  }

  it('two of five, then four of the next five (six of ten): the period counts', async () => {
    const r = await run(2, 4);
    expect(r.reads).toBe(5 + MORE_READS_WHEN_SPLIT);
    expect(r.written).toEqual(['K3']);
  });

  it('three of five, then one of the next five (four of ten): the period does not count', async () => {
    const r = await run(3, 1);
    expect(r.reads).toBe(5 + MORE_READS_WHEN_SPLIT);
    expect(r.written).toEqual([]);
  });

  it('when the settling lets a code go, the log says so in one line: the code and the reason, no observation', async () => {
    const r = await run(3, 1);
    const said = r.lines.filter((l) => l.includes('does not count'));
    expect(said).toEqual(['Check-in check-1: K3 does not count for period 4. 3 of the first 5 reads kept it, but only 4 of all 10 reads did once the split was read again.']);
    expect(said[0]).not.toContain('freezer');
  });

  it('when the settling keeps a code, no "does not count" line is written', async () => {
    expect((await run(3, 4)).lines.some((l) => l.includes('does not count'))).toBe(false);
  });

  it('four of five agreed: no more reads, and the period counts', async () => {
    const r = await run(4, 0);
    expect(r.reads).toBe(5);
    expect(r.written).toEqual(['K3']);
  });

  it('one of five: no more reads, and nothing is written', async () => {
    const r = await run(1, 5);
    expect(r.reads).toBe(5);
    expect(r.written).toEqual([]);
  });

  it('a pattern already counted in three periods brings no more reads; three of five decides as before', async () => {
    const r = await run(3, 0, [1, 2, 3]);
    expect(r.reads).toBe(5);
    expect(r.written).toEqual(['K3']);
  });

  it('when the extra reads do not come back, three of five decides as before', async () => {
    expect((await run(3, 'fail')).written).toEqual(['K3']);
    expect((await run(2, 'fail')).written).toEqual([]);
  });
});
