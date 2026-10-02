/**
 * E2, B2, K3 AND B11 ARE JUDGED ONCE ACROSS THEIR PERIODS (decision 75, item 42, 2 October 2026).
 *
 * These tests fail on the code before the change: there, each of the four was decided period by
 * period (three of five reads of this check-in), no judgement call was made, and an earlier period
 * could never be confirmed or dropped.
 */
import { PatternsService } from './patterns.service';
import {
  JUDGED_ONCE_CODES,
  JUDGED_ONCE_PROMPT,
  JUDGEMENT_READS,
  thePeriodsItCanSee,
  whatOneJudgementSays,
  whereEachCodeShows,
  theirPeriodsAfterTheJudgement,
  theRunEndingAtTheNewest,
  theJudgementReads,
  aLineForTheJudgement,
} from './a-pattern-over-time-is-judged-once-on-all-its-periods';
import { theEarlierPeriodsItShows, theirOwnEarlierRecord } from './the-detector-reads-their-own-earlier-record';
import { BAD_FAITH_CODES, WHAT_COUNTS_BY_CODE, PATTERN_DETECTION_PROMPT } from './pattern-library';
import { PatternStatus } from '@prisma/client';

const said = (pairs: [string, number[]][]) => new Map(pairs.map(([code, periods]) => [code, { periods, observation: `${code} came up again.` }]));

describe('the judgement, on its own', () => {
  it('sees this period and the two earlier periods their own record shows, newest first', () => {
    expect(thePeriodsItCanSee(5, [4, 3])).toEqual([5, 4, 3]);
    expect(thePeriodsItCanSee(5, [])).toEqual([5]);
    const line = (n: number) => ({ type: 'COMMITMENT', text: `Promise ${n}`, createdAt: new Date(2026, 8, n), checkIn: { sessionNumber: n, completedAt: null, startedAt: null, createdAt: new Date(2026, 8, n), ground: { cadence: 'WEEKLY' } } });
    expect(theEarlierPeriodsItShows([line(1), line(2), line(3), line(4)], 5)).toEqual([4, 3]);
  });

  it('turns the model\'s period names back into period numbers, and ignores codes it was not asked about', () => {
    const r = whatOneJudgementSays({ patterns: [
      { code: 'E2', showsIn: ['THIS_PERIOD', 'ONE_PERIOD_BEFORE'], observation: 'The supplier call was promised again.' },
      { code: 'K5', showsIn: ['THIS_PERIOD'], observation: 'Not asked.' },
      { code: 'B2', showsIn: [], observation: 'Shows nowhere.' },
    ] }, [5, 4, 3], ['E2', 'B2']);
    expect([...r.keys()]).toEqual(['E2']);
    expect(r.get('E2')!.periods).toEqual([4, 5]);
  });

  it('a period counts when most reads put the code there; it can confirm an earlier period or drop one', () => {
    const reads = [said([['E2', [3, 4, 5]]]), said([['E2', [3, 4]]]), said([['E2', [4, 5]]]), said([['E2', [4]]]), said([])];
    const w = whereEachCodeShows(reads, [5, 4, 3], ['E2'], new Map([['E2', [3, 5]]])).get('E2')!;
    expect(w.votes).toEqual({ 5: 2, 4: 4, 3: 2 });
    expect(w.showsIn).toEqual([4]);
    expect(w.holds).toBe(false);
    /* 3 and 5 were counted before and are dropped; 4 was not and is confirmed. */
    expect(theirPeriodsAfterTheJudgement([1, 3, 5], [5, 4, 3], w.showsIn)).toEqual([1, 4]);
  });

  it('a tie keeps what was counted before, either way', () => {
    const reads = [said([['K3', [5]]]), said([['K3', [5]]]), said([]), said([])];
    expect(whereEachCodeShows(reads, [5], ['K3'], new Map([['K3', [5]]])).get('K3')!.showsIn).toEqual([5]);
    expect(whereEachCodeShows(reads, [5], ['K3'], new Map()).get('K3')!.showsIn).toEqual([]);
  });

  it('holds across the periods when it shows in more than one', () => {
    const reads = [said([['B11', [4, 5]]]), said([['B11', [4, 5]]]), said([['B11', [5]]])];
    const w = whereEachCodeShows(reads, [5, 4], ['B11'], new Map()).get('B11')!;
    expect(w.showsIn).toEqual([4, 5]);
    expect(w.holds).toBe(true);
  });

  it('keeps the consecutive run the way the rest of the detector keeps it', () => {
    expect(theRunEndingAtTheNewest([1, 3, 4, 5])).toBe(3);
    expect(theRunEndingAtTheNewest([2, 4])).toBe(1);
    expect(theRunEndingAtTheNewest([])).toBe(0);
  });

  it('reads the four codes with their names, signals and what counts, unchanged, and names the periods it can see', () => {
    for (const code of JUDGED_ONCE_CODES) {
      const c = BAD_FAITH_CODES.find((x) => x.code === code)!;
      expect(JUDGED_ONCE_PROMPT).toContain(`- ${code} (${c.name}): ${c.signal} ${WHAT_COUNTS_BY_CODE[code]}`);
      /* And the period-by-period detector still lists every one of them: nothing removed or merged. */
      expect(PATTERN_DETECTION_PROMPT).toContain(`- ${code} (${c.name}): ${c.signal}`);
    }
    expect(theJudgementReads('PERIOD 5\n\nTRANSCRIPT:', [5, 4])).toMatch(/^THE PERIODS YOU CAN SEE\. THIS_PERIOD is the check-in below\. ONE_PERIOD_BEFORE is Period 4 in their earlier record\./);
  });

  it('says in one line what it decided for each code, with no observation in it', () => {
    const w = { showsIn: [4, 5], votes: { 5: 3, 4: 4 }, reads: 5, holds: true, observation: 'Promised the supplier call again.' };
    const line = aLineForTheJudgement('c1', 5, [5, 4], new Map([['E2', { ...w, before: [4], after: [4, 5] }]]), new Map([['B11', 'waiting' as const], ['K3', 'shown' as const]]));
    expect(line).toBe('Check-in c1, period 5: judged once across periods 4 and 5. E2 shows in periods 4 and 5, so it holds across them (2 periods counted in all, 1 before). K3 is already shown, so it is decided period by period as before. B11 is not judged for this person, who is waiting on somebody here.');
    expect(line).not.toContain('supplier');
  });
});

/*
 * analyzeCheckIn, end to end, with a stand-in model. Period 5 of a weekly check-in; the person's own
 * earlier record holds periods 3 and 4. The detector's five reads and the judgement's five reads are
 * told apart by the tool each call asks for.
 */
describe('analyzeCheckIn judges the four once, across their periods', () => {
  const earlier = (n: number) => ({
    type: 'COMMITMENT', text: `I will call the freezer supplier by Friday (${n}).`, participantId: 'p1', createdAt: new Date(2026, 8, n),
    checkIn: { sessionNumber: n, completedAt: null, startedAt: null, createdAt: new Date(2026, 8, n), ground: { cadence: 'WEEKLY' } },
  });

  function build(opts: {
    detector: (read: number) => { code: string; observation: string }[];
    judgement?: (read: number) => any;
    rows?: any[];
    waiting?: boolean;
  }) {
    const rows = opts.rows ?? [];
    const prisma: any = {
      checkIn: {
        findUnique: jest.fn(async () => ({ id: 'check-5', groundId: 'g1', participantId: 'p1', sessionNumber: 5, patternsAnalyzedAt: null, specificityDimensions: null, completedAt: new Date('2026-09-05'), startedAt: null, createdAt: new Date('2026-09-05'), ground: { cadence: 'WEEKLY' } })),
        update: jest.fn(async () => ({})),
      },
      conversationTurn: { findMany: jest.fn(async () => [{ role: 'PERSON', content: 'I will call the freezer supplier by Friday. The supplier has not called back.', createdAt: new Date() }]) },
      recordEntry: { findMany: jest.fn(async (args: any) => (args?.where?.type?.in ? [earlier(3), earlier(4)] : [])) },
      patternDetection: {
        findMany: jest.fn(async (args: any) => (args?.select?.seenInSessions ? rows : [])),
        findUnique: jest.fn(async (args: any) => rows.find((r) => r.code === args.where.participantId_code.code) ?? null),
        update: jest.fn(async (args: any) => ({ id: args.where.id, ...args.data })),
      },
      groundDependency: { findMany: jest.fn(async () => (opts.waiting ? [{ onParticipantId: 'p2', status: 'OPEN', what: 'the contract' }] : [])) },
    };
    let detectorRead = 0, judgementRead = 0;
    const model: any = {
      extract: jest.fn(async (_system: string, _history: any, tool: any) => {
        if (tool.name === 'say_where_each_pattern_shows') {
          judgementRead += 1;
          if (!opts.judgement) throw new Error('no judgement in this test');
          return opts.judgement(judgementRead);
        }
        detectorRead += 1;
        return { detections: opts.detector(detectorRead) };
      }),
      respond: jest.fn(async () => 'YES'),
    };
    const svc: any = new PatternsService(prisma, model);
    svc.buildDetectionInputForParticipant = jest.fn(async () => ({ submissions: [] }));
    const observed: string[] = [];
    svc.observe = jest.fn(async (_g: string, _p: string, code: string) => { observed.push(code); });
    svc.observePositive = jest.fn(async (_g: string, _p: string, code: string) => { observed.push(code); });
    const created: any[] = [];
    svc.createAndMirror = jest.fn(async (data: any) => { created.push(data); return data; });
    const lines: string[] = [];
    jest.spyOn(svc.logger, 'log').mockImplementation((m: any) => { lines.push(String(m)); });
    const calls = () => ({
      detector: model.extract.mock.calls.filter((c: any[]) => c[2].name !== 'say_where_each_pattern_shows').length,
      judgement: model.extract.mock.calls.filter((c: any[]) => c[2].name === 'say_where_each_pattern_shows').length,
    });
    return { svc, prisma, model, observed, created, lines, calls };
  }

  const e2 = { code: 'E2', observation: 'The supplier call was promised again and not made.' };
  const k5 = { code: 'K5', observation: 'The work is listed as tasks with no goal named.' };
  const judgedAs = (showsIn: string[]) => ({ patterns: showsIn.length ? [{ code: 'E2', showsIn, observation: 'The freezer supplier call was promised again by Friday.' }] : [] });

  it('E2 kept by three of five reads of this period is not counted when the judgement across the periods does not hold it here', async () => {
    const t = build({ detector: (n) => (n <= 3 ? [e2] : []), judgement: (n) => judgedAs(n <= 2 ? ['THIS_PERIOD'] : []) });
    await t.svc.analyzeCheckIn('check-5');
    expect(t.calls().judgement).toBe(JUDGEMENT_READS);
    /* Not written period by period, and no row made: the judgement found it in no period. */
    expect(t.observed).not.toContain('E2');
    expect(t.created).toEqual([]);
  });

  it('when most judgement reads hold E2 in all three periods, it is counted in all three at once, and may be read', async () => {
    const t = build({ detector: (n) => (n <= 2 ? [e2] : []), judgement: (n) => judgedAs(n <= 3 ? ['THIS_PERIOD', 'ONE_PERIOD_BEFORE', 'TWO_PERIODS_BEFORE'] : ['THIS_PERIOD']) });
    await t.svc.analyzeCheckIn('check-5');
    expect(t.created).toHaveLength(1);
    expect(t.created[0]).toMatchObject({ code: 'E2', seenInSessions: [3, 4, 5], lastPeriodNumber: 5, periodsObserved: 3, status: PatternStatus.SURFACED });
    expect(t.created[0].readyAt).toBeInstanceOf(Date);
    /* The two-of-five split on E2 brings no extra detector reads: the judgement decides it. */
    expect(t.calls().detector).toBe(5);
  });

  it('can drop a period counted before', async () => {
    const rows = [{ id: 'row-e2', code: 'E2', seenInSessions: [3, 4], periodsObserved: 2, readyAt: null, status: PatternStatus.CANDIDATE, evidenceSource: null }];
    const t = build({ rows, detector: () => [], judgement: () => judgedAs(['ONE_PERIOD_BEFORE']) });
    await t.svc.analyzeCheckIn('check-5');
    expect(t.calls().judgement).toBe(JUDGEMENT_READS);
    const update = t.prisma.patternDetection.update.mock.calls[0][0];
    expect(update.data).toMatchObject({ seenInSessions: [4], periodsObserved: 1, lastPeriodNumber: 4, status: PatternStatus.CANDIDATE });
  });

  it('logs once per check-in, with no name and no observation, what it decided for each of the four', async () => {
    const t = build({ detector: (n) => (n <= 3 ? [e2] : []), judgement: () => judgedAs(['THIS_PERIOD', 'ONE_PERIOD_BEFORE']) });
    await t.svc.analyzeCheckIn('check-5');
    const judged = t.lines.filter((l) => l.includes('judged once'));
    expect(judged).toEqual(['Check-in check-5, period 5: judged once across periods 3, 4 and 5. E2 shows in periods 4 and 5, so it holds across them (2 periods counted in all, 0 before).']);
  });

  it('every other code is decided period by period, as before', async () => {
    const t = build({ detector: () => [k5], judgement: () => judgedAs([]) });
    await t.svc.analyzeCheckIn('check-5');
    expect(t.observed).toEqual(['K5']);
    expect(t.calls().judgement).toBe(0);
  });

  it('a pattern already shown is decided period by period, as before, with no judgement call', async () => {
    const rows = [{ id: 'row-e2', code: 'E2', seenInSessions: [1, 2, 3], periodsObserved: 3, readyAt: new Date(), status: PatternStatus.SURFACED, evidenceSource: null }];
    const t = build({ rows, detector: () => [e2], judgement: () => judgedAs([]) });
    await t.svc.analyzeCheckIn('check-5');
    expect(t.calls().judgement).toBe(0);
    expect(t.observed).toEqual(['E2']);
    expect(t.lines.filter((l) => l.includes('judged once'))).toEqual(['Check-in check-5, period 5: judged once across periods 3, 4 and 5. E2 is already shown, so it is decided period by period as before.']);
  });

  it('K3 and B11 are never judged about somebody waiting on another person here', async () => {
    const t = build({ waiting: true, detector: () => [{ code: 'K3', observation: 'The contract was raised again.' }], judgement: () => ({ patterns: [{ code: 'K3', showsIn: ['THIS_PERIOD', 'ONE_PERIOD_BEFORE', 'TWO_PERIODS_BEFORE'], observation: 'The contract was raised again.' }] }) });
    await t.svc.analyzeCheckIn('check-5');
    expect(t.calls().judgement).toBe(0);
    expect(t.created).toEqual([]);
    expect(t.observed).toEqual([]);
  });

  it('when too few judgement reads come back, the four are decided period by period, as before', async () => {
    const t = build({ detector: (n) => (n <= 4 ? [e2] : []) });
    await t.svc.analyzeCheckIn('check-5');
    expect(t.observed).toEqual(['E2']);
    expect(t.lines.some((l) => l.includes('E2 could not be judged, because too few reads came back.'))).toBe(true);
  });

  it('a judgement read whose observation rests on a record nobody holds is left out of that read', async () => {
    const t = build({ detector: (n) => (n <= 3 ? [e2] : []), judgement: () => ({ patterns: [{ code: 'E2', showsIn: ['THIS_PERIOD', 'ONE_PERIOD_BEFORE', 'TWO_PERIODS_BEFORE'], observation: 'The record shows no payments were made to the supplier.' }] }) });
    await t.svc.analyzeCheckIn('check-5');
    expect(t.created).toEqual([]);
  });

  it('the judgement reads the same text the detector reads, with the periods named at the top', async () => {
    const t = build({ detector: (n) => (n <= 3 ? [e2] : []), judgement: () => judgedAs([]) });
    await t.svc.analyzeCheckIn('check-5');
    const detectorText = t.model.extract.mock.calls.find((c: any[]) => c[2].name !== 'say_where_each_pattern_shows')[1][0].content;
    const judgementText = t.model.extract.mock.calls.find((c: any[]) => c[2].name === 'say_where_each_pattern_shows')[1][0].content;
    expect(judgementText.endsWith(detectorText)).toBe(true);
    expect(detectorText).toContain(theirOwnEarlierRecord([earlier(3), earlier(4)] as any, 5));
  });
});
