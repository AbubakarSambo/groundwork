/**
 * THE SAME CONVERSATIONS, READ TWICE BY THE PATTERN DETECTOR (Hafsah, 30 September 2026, step 2).
 *
 * Only 15% of person-and-pattern findings repeated between run-19 and run-20. Two things could make
 * that happen: the detector reading the same words differently each time, or the simulated people
 * saying different things each run. This separates them without a new scenario run.
 *
 * For every check-in of a stored run that the detector already read, it rebuilds exactly the input
 * `PatternsService.analyzeCheckIn` builds (transcript, record, goals stated earlier, the period, and
 * the block about what was seen last period), and hands it to the detector twice. Each read goes
 * through the same deterministic filters and, for the codes that need it, the same second model call
 * that confirms them. Nothing is written: no pattern row, no mark on the check-in.
 *
 * It then compares the two reads, per check-in and per scenario (the person and pattern pairs a
 * scenario ends with), with the same measure `pattern-steadiness.ts` uses across runs.
 *
 * STEADY=1 uses the model's steadiest setting (temperature 0, a fixed seed - see
 * PATTERN_DETECTION_STEADY_OPTIONS in patterns.service.ts) on both reads instead of the model's
 * default, so the three printed lines say how steady the STEADY setting is, not the default.
 *
 * RECALL=1 answers the other half of the question: is the steady read still right. For each
 * check-in it does five reads at the model's default setting plus one steady read, calls a code
 * "in the consensus" when at least 3 of the 5 default reads kept it, and reports how much of that
 * consensus the steady read keeps (recall) and how much it keeps that the consensus does not
 * (extra), against the baseline of how much of the consensus a single default read keeps on its
 * own (measured leave-one-out: each default read against the consensus of the other four).
 * SCENARIOS=sales,pip,... limits either mode to a comma list of scenario names, since RECALL does
 * six reads per check-in and need not run the whole folder.
 *
 * PRODUCT=1 COPIES=6 TAG=-x reads every check-in thirty times through the product's own whatOneReadKeeps, kept
 * as six copies of five; MORE=1 then walks each person's periods through the product's own rule for split
 * periods (whatCountsThisPeriod) with no model call, for journey/what-each-person-is-shown-read-twice.py
 * (decision 68, 1 October 2026):
 *   PRODUCT=1 COPIES=4 TAG=-four GEMINI_LOCATION=global DATABASE_URL=... npx ts-node -T journey/the-detector-read-twice.ts all-24/six-a
 *   MORE=1 READS=product-reads-5-four.json,product-reads-5-extra.json ARRANGEMENTS="0+1/2+3;2+3/4+5;4+5/0+1" TAG=-six DATABASE_URL=... npx ts-node -T journey/the-detector-read-twice.ts all-24/six-a
 *
 * Usage (from api/, local test database only):
 *   DATABASE_URL=postgresql://hafsahjumare@localhost:5432/gw_pw9_1786222102 \
 *     npx ts-node -T journey/the-detector-read-twice.ts all-24/run-20
 *   STEADY=1 DATABASE_URL=... npx ts-node -T journey/the-detector-read-twice.ts all-24/run-20
 *   RECALL=1 SCENARIOS=sales,seniorhire,pip,loans,handover,advisor,board,crisis,drift,project \
 *     DATABASE_URL=... npx ts-node -T journey/the-detector-read-twice.ts all-24/run-20
 */
import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { AnthropicService } from '../src/modules/conversation';
import { PatternsService, PATTERN_DETECTION_STEADY_OPTIONS } from '../src/modules/patterns/patterns.service';
import { TurnRole } from '@prisma/client';
import { periodOf } from '../src/modules/patterns/period-of';
import { whatWasSeenLastPeriod, lastPeriodBlockFor, evidenceBorrowedFromAnotherCode, HOW_FAR_BACK } from '../src/modules/patterns/the-detector-has-no-memory-of-last-period';
import { isAgainstAGoalTheyStated, whatTheySaidThisWasFor } from '../src/modules/patterns/against-the-goal-they-stated';
import { saysSomethingCheckable } from '../src/modules/board/reads';
import { shouldThisCodeBeAboutThem } from '../src/modules/patterns/a-chaser-is-not-the-blocker';
import { PATTERN_DETECTION_PROMPT, PATTERN_DETECTION_SCHEMA, isBadFaithCode, isPositiveCode, isCarryingCode } from '../src/modules/patterns/pattern-library';
import { theirOwnEarlierRecord, earlierRecordQuery } from '../src/modules/patterns/the-detector-reads-their-own-earlier-record';
import { theReadsWereSplit, couldChangeWhatIsShown, whatCountsThisPeriod, votesOf } from '../src/modules/patterns/a-period-at-the-line-is-settled-on-all-the-evidence';
import { PERIODS_BEFORE_A_PATTERN_IS_SHOWN } from '../src/modules/patterns/who-reads-a-pattern';
import { READS_THAT_MUST_AGREE } from '../src/modules/patterns/patterns.service';
import { jaccard } from './pattern-steadiness';
import { JUDGED_ONCE_CODES, whereEachCodeShows, theirPeriodsAfterTheJudgement, thePeriodsItCanSee, theEarlierPeriodsItShows, whatOneJudgementKeeps } from './the-judgement-across-periods-that-was-tried';

if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? '') || !/gw_/.test(process.env.DATABASE_URL ?? '')) {
  console.error('Refusing: a local gw_ test database only.');
  process.exit(1);
}

const STEADY = process.env.STEADY === '1';
const RECALL = process.env.RECALL === '1';
/* MANY=1: every check-in read 6 times at the default setting and 6 times at the steady setting, all kept
   to many-reads.json for comparing single reads, the steady setting and majority reading (30 Sep 2026). */
const MANY = process.env.MANY === '1';
const ONLY_SCENARIOS = process.env.SCENARIOS ? new Set(process.env.SCENARIOS.split(',').map((s) => s.trim()).filter(Boolean)) : null;

interface ARead { raw: Set<string>; kept: Set<string> }
type AnOptions = { temperature?: number; seed?: number; thinkingBudget?: number };

async function main() {
  const folder = path.resolve(__dirname, process.argv[2] ?? 'all-24/run-20');
  if (process.env.MORE === '1') {
    /*
     * WHAT EACH PERSON WOULD BE SHOWN, THROUGH THE PRODUCT'S OWN RULE, FROM STORED READS (decision 68, 1 October 2026).
     * No model call: it reads the dumps PRODUCT=1 wrote (READS=a comma list of files in the folder, merged by
     * check-in, each check-in then holding several copies of five reads) and walks each person's periods in order
     * exactly as analyzeCheckIn does, with whatCountsThisPeriod and couldChangeWhatIsShown: the first five reads of
     * one copy, and, when a code is split on a pattern not yet shown, the five reads of a second copy as the five
     * more reads. "Before" walks the same first copies with no more reads (three of five, as before the change).
     * ARRANGEMENTS says which copies play which part: "first+more" for one reading, "/" between the two readings
     * compared, ";" between arrangements. Written to shown-<TAG>.json for journey/what-each-person-is-shown-read-twice.py.
     */
    const files = (process.env.READS ?? 'product-reads-5.json').split(',');
    const byId = new Map<string, any>();
    for (const f of files) for (const d of JSON.parse(fs.readFileSync(path.join(folder, f), 'utf8'))) {
      const had = byId.get(d.checkInId);
      if (had) had.reads.push(...d.reads); else byId.set(d.checkInId, { ...d, reads: [...d.reads] });
    }
    const PER = 5;
    const rows = [...byId.values()];
    const copy = (d: any, c: number) => d.reads.slice(c * PER, (c + 1) * PER).map((codes: string[]) => codes.map((code) => ({ code, observation: '' })));
    const people = new Map<string, any[]>();
    for (const d of rows) { const k = `${d.scenario}::${d.person}`; (people.get(k) ?? people.set(k, []).get(k)!).push(d); }
    let moreTaken = 0, checkInReadings = 0;
    const walk = (list: any[], first: number, more: number | null) => {
      const counted = new Map<string, number[]>();
      for (const d of [...list].sort((a, b) => a.period - b.period)) {
        const toSettle = (code: string, n: number) => theReadsWereSplit(n, READS_THAT_MUST_AGREE) && couldChangeWhatIsShown(counted.get(code) ?? [], d.period, PERIODS_BEFORE_A_PATTERN_IS_SHOWN);
        const firstReads = copy(d, first);
        const anySplit = more !== null && [...votesOf(firstReads)].some(([code, { count }]) => toSettle(code, count));
        if (more !== null) { checkInReadings++; if (anySplit) moreTaken++; }
        const counts = whatCountsThisPeriod(firstReads, anySplit ? copy(d, more!) : [], toSettle, READS_THAT_MUST_AGREE);
        for (const code of counts.keys()) counted.set(code, [...(counted.get(code) ?? []), d.period]);
      }
      return Object.fromEntries([...counted].map(([code, ps]) => [code, ps.length]));
    };
    const arrangements = (process.env.ARRANGEMENTS ?? '0+1/2+3').split(';').map((a) => a.split('/').map((r) => r.split('+').map(Number)));
    const out: any[] = [];
    arrangements.forEach((pair, i) => {
      for (const [key, list] of people) {
        out.push({
          arrangement: i, person: key,
          before: pair.map(([f]) => walk(list, f, null)),
          after: pair.map(([f, m]) => walk(list, f, m)),
        });
      }
    });
    const file = path.join(folder, `shown${process.env.TAG ?? ''}.json`);
    fs.writeFileSync(file, JSON.stringify({ arrangements: process.env.ARRANGEMENTS ?? '0+1/2+3', rows: out, moreTaken, checkInReadings }));
    console.log(`Walked ${people.size} people in ${arrangements.length} arrangements; five more reads were taken on ${moreTaken} of ${checkInReadings} check-in readings. Kept in ${file}.`);
    process.exit(0);
  }

  if (process.env.JUDGED_WALK === '1') {
    /*
     * E2, B2, K3 AND B11 JUDGED ONCE ACROSS THEIR PERIODS, WALKED THROUGH THE PRODUCT'S OWN RULES (decision 75,
     * item 42, 2 October 2026). No model call. It reads the detector's stored reads (READS, copies of five, as
     * for MORE=1) and the judgement's stored reads (judged-reads<JTAG>.json, written by JUDGE=1, copies of five),
     * and walks each person's periods in order the way analyzeCheckIn now does:
     *   before  as committed before the change: three of five, a split period on a pattern not yet shown read
     *           five more times (the MORE=1 "after");
     *   after   the same, except that E2, B2, K3 and B11, while not yet shown and in play (raised by this
     *           period's reads, or counted in a period the judgement decides), are set over the periods it can
     *           see by the majority of five judgement reads (whereEachCodeShows, theirPeriodsAfterTheJudgement).
     * ARRANGEMENTS as for MORE=1; JUDGE_PAIRS says which judgement copies the two readings of each arrangement
     * use ("0/1;2/3;..."), never the same copy on both sides. DECIDES=2 lets the judgement decide only the two
     * newest periods it can see (the product decides all it can see). Written to shown-judged<TAG>.json for
     * journey/what-each-person-is-shown-judged-once.py.
     */
    const files = (process.env.READS ?? 'product-reads-5-four.json,product-reads-5-extra.json').split(',');
    const byId = new Map<string, any>();
    for (const f of files) for (const d of JSON.parse(fs.readFileSync(path.join(folder, f), 'utf8'))) {
      const had = byId.get(d.checkInId);
      if (had) had.reads.push(...d.reads); else byId.set(d.checkInId, { ...d, reads: [...d.reads] });
    }
    const judgedFile = JSON.parse(fs.readFileSync(path.join(folder, `judged-reads${process.env.JTAG ?? ''}.json`), 'utf8'));
    const judgedById = new Map<string, any>(judgedFile.map((d: any) => [d.checkInId, d]));
    const PER = 5;
    const DECIDES = Number(process.env.DECIDES ?? 3);
    const rows = [...byId.values()].filter((d) => judgedById.has(d.checkInId));
    const missing = [...byId.keys()].filter((id) => !judgedById.has(id)).length;
    const copy = (d: any, c: number) => d.reads.slice(c * PER, (c + 1) * PER).map((codes: string[]) => codes.map((code) => ({ code, observation: '' })));
    const judgementCopy = (d: any, c: number) => judgedById.get(d.checkInId).reads.slice(c * PER, (c + 1) * PER)
      .map((r: Record<string, number[]>) => new Map(Object.entries(r).map(([code, periods]) => [code, { periods, observation: '' }])));
    const people = new Map<string, any[]>();
    for (const d of rows) { const k = `${d.scenario}::${d.person}`; (people.get(k) ?? people.set(k, []).get(k)!).push(d); }
    const tally = { before: { more: 0 }, after: { more: 0, judged: 0 }, readings: 0 };
    const walk = (list: any[], first: number, more: number, judgement: number | null) => {
      const counted = new Map<string, number[]>();
      for (const d of [...list].sort((a, b) => a.period - b.period)) {
        const j = judgedById.get(d.checkInId);
        const window: number[] = j.window.slice(0, DECIDES);
        const firstReads = copy(d, first);
        const firstVotes = votesOf(firstReads);
        const shown = (code: string) => new Set(counted.get(code) ?? []).size >= PERIODS_BEFORE_A_PATTERN_IS_SHOWN;
        const judged = judgement === null ? [] : (JUDGED_ONCE_CODES as readonly string[]).filter((code) =>
          (firstVotes.has(code) || (counted.get(code) ?? []).some((p) => window.includes(p))) && !shown(code) && !(j.waiting ?? []).includes(code));
        const toSettle = (code: string, n: number) => !judged.includes(code) && theReadsWereSplit(n, READS_THAT_MUST_AGREE) && couldChangeWhatIsShown(counted.get(code) ?? [], d.period, PERIODS_BEFORE_A_PATTERN_IS_SHOWN);
        const anySplit = [...firstVotes].some(([code, { count }]) => toSettle(code, count));
        if (judgement === null) { tally.readings++; if (anySplit) tally.before.more++; }
        else { if (anySplit) tally.after.more++; if (judged.length) tally.after.judged++; }
        const counts = whatCountsThisPeriod(firstReads, anySplit ? copy(d, more) : [], toSettle, READS_THAT_MUST_AGREE);
        for (const code of counts.keys()) if (!judged.includes(code)) counted.set(code, [...new Set([...(counted.get(code) ?? []), d.period])]);
        if (judged.length) {
          const where = whereEachCodeShows(judgementCopy(d, judgement!), window, judged, counted);
          for (const code of judged) counted.set(code, theirPeriodsAfterTheJudgement(counted.get(code) ?? [], window, where.get(code)!.showsIn));
        }
      }
      return Object.fromEntries([...counted].map(([code, ps]) => [code, new Set(ps).size]));
    };
    const arrangements = (process.env.ARRANGEMENTS ?? '0+1/2+3;2+3/4+5;4+5/0+1;1+0/3+2;3+2/5+4;5+4/1+0').split(';').map((a) => a.split('/').map((r) => r.split('+').map(Number)));
    const judgePairs = (process.env.JUDGE_PAIRS ?? '0/1;2/3;0/2;1/3;0/3;1/2').split(';').map((p) => p.split('/').map(Number));
    const out: any[] = [];
    arrangements.forEach((pair, i) => {
      const jp = judgePairs[i % judgePairs.length];
      for (const [key, list] of people) {
        out.push({
          arrangement: i, person: key,
          before: pair.map(([f, m]) => walk(list, f, m, null)),
          after: pair.map(([f, m], side) => walk(list, f, m, jp[side])),
        });
      }
    });
    const file = path.join(folder, `shown-judged${process.env.TAG ?? ''}.json`);
    fs.writeFileSync(file, JSON.stringify({ arrangements: process.env.ARRANGEMENTS ?? '0+1/2+3;2+3/4+5;4+5/0+1;1+0/3+2;3+2/5+4;5+4/1+0', rows: out, tally, missing }));
    console.log(`Walked ${people.size} people in ${arrangements.length} arrangements (${missing} check-ins had no judgement reads). Before: five more reads on ${tally.before.more} of ${tally.readings} check-in readings. After: five more reads on ${tally.after.more}, a judgement on ${tally.after.judged}. Kept in ${file}.`);
    process.exit(0);
  }

  if (process.env.RULES_WALK === '1') {
    /*
     * THE TEN READS RULES=1 KEPT, WALKED FOUR WAYS, with no model call. Each person's periods are walked in
     * order exactly as analyzeCheckIn does (whatCountsThisPeriod, couldChangeWhatIsShown), reads 1 to 5 as the
     * first five and 6 to 10 as the five more:
     *   committed      both rules on, as the code stands
     *   noRecordRule   detections the record rule marks are kept
     *   noSettling     three of the first five, as before db3f8f06
     *   neither        both off
     * A pattern is a person and a code, counted from the period it is first counted in. "Like the scorer" sums,
     * over each scenario's sessions, the patterns that exist by that session, which is how tools/score_run.py
     * counts "patterns found" from a run's files.
     */
    const reads: any[] = JSON.parse(fs.readFileSync(path.join(folder, `rules-reads${process.env.TAG ?? ''}.json`), 'utf8'));
    const sessionsOf = new Map<string, number>();
    for (const f of fs.readdirSync(folder).filter((f) => f.endsWith('.json'))) {
      const d = JSON.parse(fs.readFileSync(path.join(folder, f), 'utf8'));
      if (d.groundId) sessionsOf.set(f.replace(/\.json$/, ''), (d.sessions ?? []).length);
    }
    const people = new Map<string, any[]>();
    for (const d of reads) { const k = `${d.scenario}::${d.participantId}`; (people.get(k) ?? people.set(k, []).get(k)!).push(d); }
    type Way = { record: boolean; settle: boolean };
    const WAYS: Record<string, Way> = {
      committed: { record: true, settle: true }, noRecordRule: { record: false, settle: true },
      noSettling: { record: true, settle: false }, neither: { record: false, settle: false },
    };
    const walk = (list: any[], way: Way) => {
      const counted = new Map<string, { periods: number[]; firstSession: number; observation: string }>();
      for (const d of [...list].sort((a, b) => a.period - b.period || a.session - b.session)) {
        const reads10 = d.reads.map((r: any[]) => r.filter((k) => !(way.record && k.record)).map((k) => ({ code: k.code, observation: k.observation })));
        const first = reads10.slice(0, 5), moreReads = reads10.slice(5, 10);
        const toSettle = (code: string, n: number) => way.settle && theReadsWereSplit(n, READS_THAT_MUST_AGREE) && couldChangeWhatIsShown(counted.get(code)?.periods ?? [], d.period, PERIODS_BEFORE_A_PATTERN_IS_SHOWN);
        const anySplit = [...votesOf(first)].some(([code, { count }]) => toSettle(code, count));
        for (const [code, { observation }] of whatCountsThisPeriod(first, anySplit ? moreReads : [], toSettle, READS_THAT_MUST_AGREE)) {
          const had = counted.get(code);
          if (had) { if (!had.periods.includes(d.period)) had.periods.push(d.period); }
          else counted.set(code, { periods: [d.period], firstSession: d.session, observation });
        }
      }
      return counted;
    };
    const result: any = { ways: {}, perScenario: {}, differences: {} };
    const byWay: Record<string, Map<string, any>> = {};
    for (const [name, way] of Object.entries(WAYS)) {
      const all = new Map<string, any>();
      for (const [key, list] of people) for (const [code, v] of walk(list, way)) all.set(`${key}::${code}`, { ...v, scenario: list[0].scenario, person: list[0].person, code });
      byWay[name] = all;
      const scen: Record<string, { patterns: number; likeTheScorer: number }> = {};
      for (const s of sessionsOf.keys()) scen[s] = { patterns: 0, likeTheScorer: 0 };
      for (const v of all.values()) {
        scen[v.scenario].patterns++;
        scen[v.scenario].likeTheScorer += Math.max(0, (sessionsOf.get(v.scenario) ?? 0) - v.firstSession + 1);
      }
      result.perScenario[name] = scen;
      result.ways[name] = { patterns: all.size, likeTheScorer: Object.values(scen).reduce((p, q) => p + q.likeTheScorer, 0) };
    }
    for (const other of ['noRecordRule', 'noSettling', 'neither']) {
      result.differences[other] = {
        lostByTheRule: [...byWay[other]].filter(([k]) => !byWay.committed.has(k)).map(([, v]) => v),
        gainedByTheRule: [...byWay.committed].filter(([k]) => !byWay[other].has(k)).map(([, v]) => v),
      };
    }
    /* Every detection the record rule marked, in any read, so each can be checked against the person's own words. */
    result.markedByTheRecordRule = reads.flatMap((d) => d.reads.flatMap((r: any[], i: number) => r.filter((k) => k.record).map((k) => ({ scenario: d.scenario, checkInId: d.checkInId, person: d.person, period: d.period, read: i + 1, code: k.code, observation: k.observation }))));
    fs.writeFileSync(path.join(folder, `rules-walk${process.env.TAG ?? ''}.json`), JSON.stringify(result, null, 1));
    console.log(JSON.stringify(result.ways));
    process.exit(0);
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);
  const model = app.get(AnthropicService);
  const patterns: any = app.get(PatternsService);

  const scenarios = fs.readdirSync(folder).filter((f) => f.endsWith('.json')).map((f) => {
    const d = JSON.parse(fs.readFileSync(path.join(folder, f), 'utf8'));
    return { name: f.replace(/\.json$/, ''), groundId: d.groundId as string };
  }).filter((s) => !!s.groundId) /* only the scenarios themselves: a reads file has no groundId, and an empty one would read every check-in */
    .filter((s) => !ONLY_SCENARIOS || ONLY_SCENARIOS.has(s.name));

  async function readOnce(checkIn: any, content: string, block: string, statedGoals: string[], lastPeriod: any[], deps: any[], options: AnOptions = {}): Promise<ARead> {
    const result = await model.extract<{ detections: { code: string; observation: string }[] }>(
      PATTERN_DETECTION_PROMPT + block, [{ role: 'user', content }], PATTERN_DETECTION_SCHEMA, options,
    );
    const raw = new Set<string>(); const kept = new Set<string>();
    for (const d of result?.detections ?? []) {
      if (!d.observation?.trim()) continue;
      raw.add(d.code);
      if (evidenceBorrowedFromAnotherCode(d.observation, d.code, lastPeriod)) continue;
      if (isPositiveCode(d.code)) {
        if (d.code === 'M1' && !isAgainstAGoalTheyStated(d.observation, statedGoals)) continue;
        if (!saysSomethingCheckable(d.observation)) continue;
        kept.add(d.code); continue;
      }
      if (isCarryingCode(d.code)) { kept.add(d.code); continue; }
      if (!isBadFaithCode(d.code)) continue;
      if (!shouldThisCodeBeAboutThem(d.code, deps).keep) continue;
      const confirmed = await patterns.confirmDetection(d.code, d.observation.trim(), options).catch(() => false);
      if (confirmed) kept.add(d.code);
    }
    return { raw, kept };
  }

  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const mean = (xs: number[]) => (xs.length ? xs.reduce((p, q) => p + q, 0) / xs.length : 1);

  /** Everything readOnce needs for one check-in, gathered once whichever mode is running. */
  async function contextFor(checkIn: any) {
    const period = periodOf({ sessionNumber: checkIn.sessionNumber, when: checkIn.completedAt ?? checkIn.startedAt ?? checkIn.createdAt }, checkIn.ground);
    const [turns, records, goals] = await Promise.all([
      prisma.conversationTurn.findMany({ where: { checkInId: checkIn.id }, orderBy: { createdAt: 'asc' } }),
      prisma.recordEntry.findMany({ where: { checkInId: checkIn.id } }),
      prisma.recordEntry.findMany({
        where: { participantId: checkIn.participantId, disputedAt: null, type: 'SUCCESS_DEFINITION' as any, checkIn: { sessionNumber: { lt: checkIn.sessionNumber } } },
        orderBy: { createdAt: 'asc' }, select: { text: true }, take: 12,
      }),
    ]);
    if (turns.length === 0 && records.length === 0) return null;
    const statedGoals = goals.map((r) => r.text);
    const transcript = turns.map((t) => `${t.role === TurnRole.AI ? 'GROUNDWORK' : 'PERSON'}: ${t.content}`).join('\n');
    const recordText = records.map((r) => `(${r.type}) ${r.text}`).join('\n');
    /* The same text analyzeCheckIn builds, their own earlier record included (634569fc). */
    const earlier = await prisma.recordEntry.findMany(earlierRecordQuery(checkIn.participantId, checkIn.sessionNumber) as any);
    const content = `PERIOD ${period}\n\nTRANSCRIPT:\n${transcript}\n\nEXTRACTED RECORD:\n${recordText}${whatTheySaidThisWasFor(statedGoals)}${theirOwnEarlierRecord(earlier as any, period)}`;
    /* What the person said, for the "rests on a record nobody holds" filter (fe85e9d2), as analyzeCheckIn passes it. */
    const whatThePersonSaid = [
      ...turns.filter((t) => t.role !== TurnRole.AI).map((t) => t.content ?? ''),
      ...records.map((r) => r.text),
      ...(earlier as any[]).map((r) => r?.text ?? ''),
    ];
    const lastPeriod = await prisma.patternDetection.findMany({
      where: { participantId: checkIn.participantId, lastPeriodNumber: { gte: period - HOW_FAR_BACK, lte: period - 1 } },
      select: { code: true, observationText: true, lastPeriodNumber: true },
    });
    const block = lastPeriodBlockFor(whatWasSeenLastPeriod(lastPeriod, period), period);
    const deps = await prisma.groundDependency.findMany({
      where: { groundId: checkIn.groundId, fromParticipantId: checkIn.participantId },
      select: { onParticipantId: true, status: true, what: true },
    });
    return { content, block, statedGoals, lastPeriod, deps, earlier, whatThePersonSaid, period };
  }

  /** At most LIMIT model reads in flight at once, so a whole folder does not open hundreds of calls together. */
  const LIMIT = Number(process.env.LIMIT ?? 12);
  let inFlight = 0; const waiting: (() => void)[] = [];
  async function limited<T>(fn: () => Promise<T>): Promise<T> {
    if (inFlight >= LIMIT) await new Promise<void>((r) => waiting.push(r));
    inFlight++;
    try { return await fn(); } finally { inFlight--; waiting.shift()?.(); }
  }
  const personOf = (checkIn: any) => (checkIn.participant?.user?.email ?? 'unknown').split('@')[0].split('.')[0];
  const checkInsOf = (groundId: string) => prisma.checkIn.findMany({
    where: { groundId, patternsAnalyzedAt: { not: null } },
    select: { id: true, groundId: true, participantId: true, sessionNumber: true, completedAt: true, startedAt: true, createdAt: true,
      ground: { select: { cadence: true } }, participant: { select: { user: { select: { email: true } } } } },
    orderBy: { sessionNumber: 'asc' },
  });

  if (process.env.RULES === '1') {
    /*
     * HOW MUCH OF A FALL EACH OF TWO RULES CAUSES, ON THE SAME READS (2 October 2026).
     *
     * run-23 stored fewer patterns than run-21. Two rules came in between (the record nobody holds,
     * fe85e9d2, and the ten-read settling, db3f8f06), and the conversations changed too. To separate the
     * rules from the conversations, every check-in of one stored run is read ten times through the
     * product's own whatOneReadKeeps, with one change: restsOnARecordNobodyHolds marks a detection
     * instead of dropping it, so the read carries on through the rest of the filters (the confirming
     * call included) exactly as it would have without the rule. Each kept detection is written with that
     * mark. RULES_WALK=1 then walks the same reads three ways, with no model call.
     *   RULES=1 LIMIT=10 GEMINI_LOCATION=global EMAIL_SENDS_FOR_REAL=false DATABASE_URL=... npx ts-node -T journey/the-detector-read-twice.ts <run folder>
     */
    const recordModule = require('../src/modules/patterns/a-pattern-does-not-rest-on-a-record-nobody-holds');
    const theRule = recordModule.restsOnARecordNobodyHolds;
    const { AsyncLocalStorage } = require('async_hooks');
    const thisRead = new AsyncLocalStorage();
    recordModule.restsOnARecordNobodyHolds = (observation: string, said: string[]) => {
      const store = thisRead.getStore();
      if (theRule(observation, said) && store) store.marked.add((observation ?? '').trim());
      return false;
    };
    const confirmOnce = patterns.confirmDetection.bind(patterns);
    patterns.confirmDetection = async (...args: any[]) => {
      for (let attempt = 1; attempt <= 4; attempt++) {
        try { return await confirmOnce(...args); } catch { await new Promise((r) => setTimeout(r, 8000 * attempt)); }
      }
      const store = thisRead.getStore(); if (store) store.failed = true;
      throw new Error('the confirming call did not come back');
    };
    const out = path.join(folder, `rules-reads${process.env.TAG ?? ''}.json`);
    const dump: any[] = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : [];
    const already = new Set(dump.map((d) => d.checkInId));
    const oneRead = async (checkIn: any, ctx: any, getInput: () => any) => {
      for (let attempt = 1; attempt <= 4; attempt++) {
        const store = { failed: false, marked: new Set<string>() };
        try {
          const kept = await limited(() => Promise.race([
            thisRead.run(store, () => patterns.whatOneReadKeeps(checkIn.id, ctx.content, ctx.block, ctx.lastPeriod, ctx.statedGoals, ctx.deps, getInput, ctx.whatThePersonSaid)),
            new Promise((_, no) => setTimeout(() => no(new Error('the read took more than five minutes')), 300000)),
          ])) as { code: string; observation: string }[];
          if (!store.failed) return kept.map((k) => ({ ...k, record: store.marked.has(k.observation.trim()) }));
        } catch (e: any) { process.stderr.write(`read failed (attempt ${attempt}): ${String(e?.message ?? e).slice(0, 160)}\n`); }
        await new Promise((r) => setTimeout(r, 10000 * attempt));
      }
      return null;
    };
    /* Every scenario at once; LIMIT still caps the reads in flight, so the model never sees more than LIMIT at a time. */
    await Promise.all(scenarios.map(async (s) => {
      const checkIns = (await checkInsOf(s.groundId)).filter((c: any) => !already.has(c.id));
      for (const checkIn of checkIns) {
        const ctx = await contextFor(checkIn);
        if (!ctx) continue;
        const getInput = () => patterns.buildDetectionInputForParticipant(checkIn.participantId);
        const reads = await Promise.all(Array.from({ length: 10 }, () => oneRead(checkIn, ctx, getInput)));
        if (reads.some((r) => !r)) { process.stderr.write(`check-in ${checkIn.id}: not all ten reads came back\n`); continue; }
        dump.push({ scenario: s.name, checkInId: checkIn.id, participantId: checkIn.participantId, session: checkIn.sessionNumber, period: ctx.period, person: personOf(checkIn), reads });
        fs.writeFileSync(out, JSON.stringify(dump));
      }
      process.stderr.write(`rules-read ${s.name}\n`);
    }));
    console.log(`Ten reads of ${dump.length} check-ins, kept in ${out}.`);
    await app.close();
    process.exit(0);
  }

  if (process.env.JUDGE === '1') {
    /*
     * THE JUDGEMENT ACROSS THEIR PERIODS, READ AS THE TRIED PRODUCT CODE MADE IT (decision 75, item 42, 2 October 2026).
     * For every check-in in the stored detector reads (READS, as for MORE=1), the same text analyzeCheckIn builds,
     * the periods it can see, and COPIES copies of five reads of whatOneJudgementKeeps as the tried product code made it, asked about all
     * four codes as the product asks. Also kept: which of K3 and B11 the chaser guard keeps from this person. A read
     * the model did not answer is asked again (up to four times). Nothing is written. ONLY_MISSING=1 keeps what an
     * earlier run read. JUDGED_WALK=1 then walks them.
     *   JUDGE=1 COPIES=4 LIMIT=10 GEMINI_LOCATION=global EMAIL_SENDS_FOR_REAL=false DATABASE_URL=... npx ts-node -T journey/the-detector-read-twice.ts all-24/six-a
     */
    const COPIES = Number(process.env.COPIES ?? 4), PER = 5;
    const files = (process.env.READS ?? 'product-reads-5-four.json').split(',');
    const wanted = new Set<string>();
    for (const f of files) for (const d of JSON.parse(fs.readFileSync(path.join(folder, f), 'utf8'))) wanted.add(d.checkInId);
    const out = path.join(folder, `judged-reads${process.env.JTAG ?? ''}.json`);
    const dump: any[] = process.env.ONLY_MISSING === '1' && fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : [];
    const already = new Set(dump.map((d) => d.checkInId));
    const { shouldThisCodeBeAboutThem: aboutThem } = require('../src/modules/patterns/a-chaser-is-not-the-blocker');
    const oneRead = async (checkIn: any, ctx: any, window: number[]): Promise<Record<string, number[]> | null> => {
      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          const r = await limited(() => Promise.race([
            whatOneJudgementKeeps(model, PATTERN_DETECTION_STEADY_OPTIONS, ctx.content, window, [...JUDGED_ONCE_CODES], ctx.whatThePersonSaid),
            new Promise((_, no) => setTimeout(() => no(new Error('the read took more than five minutes')), 300000)),
          ])) as Map<string, { periods: number[] }>;
          return Object.fromEntries([...r].map(([code, v]) => [code, v.periods]));
        } catch (e: any) { process.stderr.write(`judgement read failed (attempt ${attempt}): ${String(e?.message ?? e).slice(0, 160)}\n`); }
        await new Promise((r) => setTimeout(r, 10000 * attempt));
      }
      return null;
    };
    for (const s of scenarios) {
      const checkIns = (await checkInsOf(s.groundId)).filter((c: any) => wanted.has(c.id) && !already.has(c.id));
      await Promise.all(checkIns.map(async (checkIn: any) => {
        const ctx = await contextFor(checkIn);
        if (!ctx) return;
        const window = thePeriodsItCanSee(ctx.period, theEarlierPeriodsItShows(ctx.earlier as any, ctx.period));
        const reads = await Promise.all(Array.from({ length: COPIES * PER }, () => oneRead(checkIn, ctx, window)));
        if (reads.some((r) => !r)) { process.stderr.write(`check-in ${checkIn.id}: not all ${COPIES * PER} judgement reads came back\n`); return; }
        const waiting = (JUDGED_ONCE_CODES as readonly string[]).filter((code) => !aboutThem(code, ctx.deps).keep);
        dump.push({ scenario: s.name, checkInId: checkIn.id, period: ctx.period, person: personOf(checkIn), window, waiting, reads });
        process.stderr.write(`judged ${s.name} ${personOf(checkIn)} period ${ctx.period}\n`);
      }));
      fs.writeFileSync(out, JSON.stringify(dump));
      process.stderr.write(`judge-read ${s.name}\n`);
    }
    fs.writeFileSync(out, JSON.stringify(dump));
    console.log(`The judgement across their periods: ${dump.length} check-ins, ${COPIES} copies of ${PER} reads each, kept in ${out}.`);
    await app.close();
    process.exit(0);
  }

  if (process.env.PRODUCT === '1') {
    /* Through the product's own code: whatOneReadKeeps is exactly what analyzeCheckIn runs five times.
       COPIES separate five-read majorities per check-in (default 2) make readings to compare; with
       COPIES=4 two copies are compared and the other two are the independent reference for "real
       patterns", and the other way round. Nothing is written. PER=5 AGREE=3 is what the product does. */
    const PER = Number(process.env.PER ?? 5), AGREE = Number(process.env.AGREE ?? 3), COPIES = Number(process.env.COPIES ?? 2);
    const out = path.join(folder, `product-reads-${PER}${process.env.TAG ?? ''}.json`);
    /* ONLY_MISSING=1 keeps what an earlier run of this mode already read and reads only the check-ins it lost. */
    const dump: any[] = process.env.ONLY_MISSING === '1' && fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : [];
    const already = new Set(dump.map((d) => d.checkInId));
    /*
     * A BUSY MODEL MUST NOT LOOK LIKE A QUIET PERIOD. whatOneReadKeeps treats a confirming call that fails as
     * "not confirmed" (the product's own safe default), so under a burst of 429s a read silently keeps less. Here
     * the confirming call is asked again with a pause, and if it still fails the whole read is marked failed and
     * read again, so every read kept in the dump is a read the model actually answered.
     */
    const { AsyncLocalStorage } = require('async_hooks');
    const thisRead = new AsyncLocalStorage();
    const confirmOnce = patterns.confirmDetection.bind(patterns);
    patterns.confirmDetection = async (...args: any[]) => {
      for (let attempt = 1; attempt <= 4; attempt++) {
        try { return await confirmOnce(...args); } catch { await new Promise((r) => setTimeout(r, 8000 * attempt)); }
      }
      const store = thisRead.getStore(); if (store) store.failed = true;
      throw new Error('the confirming call did not come back');
    };
    /* A read the model did not answer is asked again (up to four times), so one busy minute does not drop a check-in. */
    const oneRead = async (checkIn: any, ctx: any, getInput: () => any): Promise<string[] | null> => {
      for (let attempt = 1; attempt <= 4; attempt++) {
        const store = { failed: false };
        try {
          /* Never wait on one read for more than five minutes: a call that never answers must not hold a slot for ever. */
          const k = await limited(() => Promise.race([
            thisRead.run(store, () => patterns.whatOneReadKeeps(checkIn.id, ctx.content, ctx.block, ctx.lastPeriod, ctx.statedGoals, ctx.deps, getInput, ctx.whatThePersonSaid)),
            new Promise((_, no) => setTimeout(() => no(new Error('the read took more than five minutes')), 300000)),
          ]));
          if (!store.failed) return (k as { code: string }[]).map((x) => x.code);
          process.stderr.write(`read lost a confirming call (attempt ${attempt}); reading again\n`);
        } catch (e: any) { process.stderr.write(`read failed (attempt ${attempt}): ${String(e?.message ?? e).slice(0, 160)}\n`); }
        await new Promise((r) => setTimeout(r, 10000 * attempt));
      }
      return null;
    };
    for (const s of scenarios) {
      const checkIns = (await checkInsOf(s.groundId)).filter((c: any) => !already.has(c.id));
      await Promise.all(checkIns.map(async (checkIn: any) => {
        const ctx = await contextFor(checkIn);
        if (!ctx) return;
        const getInput = () => patterns.buildDetectionInputForParticipant(checkIn.participantId);
        const reads = await Promise.all(Array.from({ length: COPIES * PER }, () => oneRead(checkIn, ctx, getInput)));
        const okReads = reads.filter((r): r is string[] => !!r);
        if (okReads.length < COPIES * PER) { process.stderr.write(`check-in ${checkIn.id}: only ${okReads.length} of ${COPIES * PER} reads came back\n`); return; }
        dump.push({ scenario: s.name, checkInId: checkIn.id, period: ctx.period, person: personOf(checkIn), reads: okReads });
        process.stderr.write(`read ${s.name} ${personOf(checkIn)} period ${ctx.period}\n`);
      }));
      fs.writeFileSync(out, JSON.stringify(dump)); /* after every scenario, so a stopped run keeps what it read */
      process.stderr.write(`product-read ${s.name}\n`);
    }
    fs.writeFileSync(out, JSON.stringify(dump));
    console.log(`Through the product's own code: ${dump.length} check-ins, ${COPIES} copies of ${PER} reads each (at least ${AGREE} agreeing), kept in ${out}. Compare with journey/what-each-person-is-shown-read-twice.py.`);
    await app.close();
    process.exit(0);
  }

  if (MANY) {
    const out: any[] = [];
    for (const s of scenarios) {
      const checkIns = await prisma.checkIn.findMany({
        where: { groundId: s.groundId, patternsAnalyzedAt: { not: null } },
        select: {
          id: true, groundId: true, participantId: true, sessionNumber: true, completedAt: true, startedAt: true, createdAt: true,
          ground: { select: { cadence: true } }, participant: { select: { user: { select: { email: true } } } },
        },
        orderBy: { sessionNumber: 'asc' },
      });
      await Promise.all(checkIns.map(async (checkIn: any) => {
        try {
          const ctx = await contextFor(checkIn);
          if (!ctx) return;
          const { content, block, statedGoals, lastPeriod, deps } = ctx;
          const one = (o: AnOptions) => readOnce(checkIn, content, block, statedGoals, lastPeriod, deps, o)
            .then((r) => ({ raw: [...r.raw], kept: [...r.kept] }))
            .catch((err: any) => ({ failed: String(err?.message ?? err).slice(0, 80) }));
          const person = (checkIn.participant?.user?.email ?? 'unknown').split('@')[0].split('.')[0];
          if (process.env.MANY_MORE === '1') {
            /* The second round: ten steady reads (two copies of five, for most of five agreeing),
               and six steady reads with the smallest thinking budget the model allows. */
            const reads = await Promise.all([
              ...Array.from({ length: 10 }, () => one(PATTERN_DETECTION_STEADY_OPTIONS)),
              ...Array.from({ length: 6 }, () => one({ ...PATTERN_DETECTION_STEADY_OPTIONS, thinkingBudget: 128 } as any)),
            ]);
            out.push({ scenario: s.name, person, session: checkIn.sessionNumber, checkInId: checkIn.id, steady: reads.slice(0, 10), steadyLittleThinking: reads.slice(10) });
            return;
          }
          const reads = await Promise.all([
            ...Array.from({ length: 6 }, () => one({})),
            ...Array.from({ length: 6 }, () => one(PATTERN_DETECTION_STEADY_OPTIONS)),
          ]);
          out.push({ scenario: s.name, person, session: checkIn.sessionNumber, checkInId: checkIn.id, normal: reads.slice(0, 6), steady: reads.slice(6) });
        } catch (err: any) {
          process.stderr.write(`skipped ${s.name}/${checkIn.id}: ${err?.message ?? err}\n`);
        }
      }));
      fs.writeFileSync(path.join(folder, process.env.MANY_MORE === '1' ? 'many-reads-2.json' : 'many-reads.json'), JSON.stringify(out, null, 1));
      process.stderr.write(`many-read ${s.name}\n`);
    }
    console.log(`MANY mode done: ${out.length} check-ins, 12 reads each, kept in many-reads.json.`);
    await app.close();
    process.exit(0);
  }

  if (RECALL) {
    /* consensus of >= 3 of 5 default reads; recall/extra of the steady read against it; the
       baseline of a single default read against the consensus of the OTHER four. */
    let consensusTotal = 0, steadyRecallHit = 0, steadyExtra = 0;
    let baselineHits = 0, baselineDenom = 0;
    const scenarioLines: string[] = [];
    for (const s of scenarios) {
      const checkIns = await prisma.checkIn.findMany({
        where: { groundId: s.groundId, patternsAnalyzedAt: { not: null } },
        select: {
          id: true, groundId: true, participantId: true, sessionNumber: true, completedAt: true, startedAt: true, createdAt: true,
          ground: { select: { cadence: true } }, participant: { select: { user: { select: { email: true } } } },
        },
        orderBy: { sessionNumber: 'asc' },
      });
      let scenarioConsensus = 0, scenarioHit = 0, scenarioExtra = 0;
      for (const checkIn of checkIns) {
        try {
          const ctx = await contextFor(checkIn);
          if (!ctx) continue;
          const { content, block, statedGoals, lastPeriod, deps } = ctx;
          const defaults: ARead[] = [];
          for (let i = 0; i < 5; i++) {
            defaults.push(await readOnce(checkIn, content, block, statedGoals, lastPeriod, deps));
          }
          const steady = await readOnce(checkIn, content, block, statedGoals, lastPeriod, deps, PATTERN_DETECTION_STEADY_OPTIONS);

          const allCodes = new Set<string>(); defaults.forEach((r) => r.kept.forEach((c) => allCodes.add(c)));
          const consensus = new Set([...allCodes].filter((c) => defaults.filter((r) => r.kept.has(c)).length >= 3));

          consensusTotal += consensus.size;
          scenarioConsensus += consensus.size;
          for (const c of consensus) if (steady.kept.has(c)) { steadyRecallHit++; scenarioHit++; }
          for (const c of steady.kept) if (!consensus.has(c)) { steadyExtra++; scenarioExtra++; }

          /* Baseline: each of the 5 default reads against the consensus (>= 3 of 4) of the OTHER four. */
          for (let i = 0; i < defaults.length; i++) {
            const others = defaults.filter((_, j) => j !== i);
            const otherCodes = new Set<string>(); others.forEach((r) => r.kept.forEach((c) => otherCodes.add(c)));
            const otherConsensus = new Set([...otherCodes].filter((c) => others.filter((r) => r.kept.has(c)).length >= 3));
            if (otherConsensus.size === 0) continue;
            let hit = 0; otherConsensus.forEach((c) => { if (defaults[i].kept.has(c)) hit++; });
            baselineHits += hit; baselineDenom += otherConsensus.size;
          }
        } catch (err: any) {
          process.stderr.write(`skipped ${s.name}/${checkIn.id}: ${err?.message ?? err}\n`);
        }
      }
      scenarioLines.push(`  ${s.name}: consensus ${scenarioConsensus}; steady kept ${scenarioHit} of them (extra ${scenarioExtra})`);
      process.stderr.write(`recall-read ${s.name}\n`);
    }
    console.log(`RECALL mode: 5 default reads + 1 steady read per check-in, across ${scenarios.length} scenario${scenarios.length === 1 ? '' : 's'} (${scenarios.map((s) => s.name).join(', ')}).`);
    console.log(`Consensus findings (kept by at least 3 of 5 default reads): ${consensusTotal}.`);
    console.log(`The steady read kept ${steadyRecallHit} of those ${consensusTotal} consensus findings (recall ${consensusTotal ? pct(steadyRecallHit / consensusTotal) : 'n/a'}), and kept ${steadyExtra} more that the consensus did not.`);
    console.log(`A single default read, on its own, kept ${baselineHits} of ${baselineDenom} findings the other four agreed on (recall ${baselineDenom ? pct(baselineHits / baselineDenom) : 'n/a'}) - the baseline the steady read has to match or beat.`);
    console.log(scenarioLines.join('\n'));
    await app.close();
    process.exit(0);
  }

  const perCheckIn: { scenario: string; person: string; session: number; a: ARead; b: ARead }[] = [];
  for (const s of scenarios) {
    const checkIns = await prisma.checkIn.findMany({
      where: { groundId: s.groundId, patternsAnalyzedAt: { not: null } },
      select: {
        id: true, groundId: true, participantId: true, sessionNumber: true, completedAt: true, startedAt: true, createdAt: true,
        ground: { select: { cadence: true } }, participant: { select: { user: { select: { email: true } } } },
      },
      orderBy: { sessionNumber: 'asc' },
    });
    await Promise.all(checkIns.map(async (checkIn: any) => {
      /* A single flaky network call must not throw away the whole run's work - see the fetch
         failure hit live on 30 September 2026. Skip and log; report what actually completed. */
      try {
        const ctx = await contextFor(checkIn);
        if (!ctx) return;
        const { content, block, statedGoals, lastPeriod, deps } = ctx;
        const options = STEADY ? PATTERN_DETECTION_STEADY_OPTIONS : {};
        const [a, b] = await Promise.all([
          readOnce(checkIn, content, block, statedGoals, lastPeriod, deps, options),
          readOnce(checkIn, content, block, statedGoals, lastPeriod, deps, options),
        ]);
        const person = (checkIn.participant?.user?.email ?? 'unknown').split('@')[0].split('.')[0];
        perCheckIn.push({ scenario: s.name, person, session: checkIn.sessionNumber, a, b });
      } catch (err: any) {
        process.stderr.write(`skipped ${s.name}/${checkIn.id}: ${err?.message ?? err}\n`);
      }
    }));
    process.stderr.write(`read ${s.name}\n`);
  }

  const bothEmpty = (r1: Set<string>, r2: Set<string>) => r1.size === 0 && r2.size === 0;

  const rawCI = perCheckIn.filter((c) => !bothEmpty(c.a.raw, c.b.raw)).map((c) => jaccard(c.a.raw, c.b.raw));
  const keptCI = perCheckIn.filter((c) => !bothEmpty(c.a.kept, c.b.kept)).map((c) => jaccard(c.a.kept, c.b.kept));
  const identicalRaw = perCheckIn.filter((c) => jaccard(c.a.raw, c.b.raw) === 1).length;
  const identicalKept = perCheckIn.filter((c) => jaccard(c.a.kept, c.b.kept) === 1).length;

  /* Per scenario: the person and pattern pairs each read found anywhere in the scenario, pooled. */
  let shared = 0, union = 0;
  const lines: string[] = [];
  for (const s of scenarios) {
    const mine = perCheckIn.filter((c) => c.scenario === s.name);
    const A = new Set<string>(), B = new Set<string>();
    for (const c of mine) { c.a.kept.forEach((k) => A.add(`${c.person}::${k}`)); c.b.kept.forEach((k) => B.add(`${c.person}::${k}`)); }
    const u = new Set([...A, ...B]); const i = [...A].filter((x) => B.has(x));
    shared += i.length; union += u.size;
    lines.push(`  ${s.name}: ${i.length} of ${u.size} pairs found by both reads${u.size ? ` (${pct(i.length / u.size)})` : ''}`);
  }

  console.log(`Check-ins read twice${STEADY ? ' (STEADY: temperature 0, fixed seed, both reads)' : ''}: ${perCheckIn.length}`);
  console.log(`What the model named, before any filter: the two reads named exactly the same codes on ${identicalRaw} of ${perCheckIn.length} check-ins; average overlap ${pct(mean(rawCI))} where either read named anything.`);
  console.log(`What would be kept, after the filters and the confirming call: exactly the same on ${identicalKept} of ${perCheckIn.length} check-ins; average overlap ${pct(mean(keptCI))} where either read kept anything.`);
  console.log(`Across whole scenarios, person and pattern pairs: ${shared} of ${union} found by both reads (${union ? pct(shared / union) : 'n/a'}).`);
  console.log(lines.join('\n'));
  fs.writeFileSync(path.join(folder, 'detector-read-twice.json'), JSON.stringify(perCheckIn.map((c) => ({
    scenario: c.scenario, person: c.person, session: c.session,
    a: { raw: [...c.a.raw], kept: [...c.a.kept] }, b: { raw: [...c.b.raw], kept: [...c.b.kept] },
  })), null, 1));
  await app.close();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
