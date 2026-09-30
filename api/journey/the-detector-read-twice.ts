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
import { jaccard } from './pattern-steadiness';

if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? '') || !/gw_/.test(process.env.DATABASE_URL ?? '')) {
  console.error('Refusing: a local gw_ test database only.');
  process.exit(1);
}

const STEADY = process.env.STEADY === '1';
const RECALL = process.env.RECALL === '1';
const ONLY_SCENARIOS = process.env.SCENARIOS ? new Set(process.env.SCENARIOS.split(',').map((s) => s.trim()).filter(Boolean)) : null;

interface ARead { raw: Set<string>; kept: Set<string> }
type AnOptions = { temperature?: number; seed?: number };

async function main() {
  const folder = path.resolve(__dirname, process.argv[2] ?? 'all-24/run-20');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);
  const model = app.get(AnthropicService);
  const patterns: any = app.get(PatternsService);

  const scenarios = fs.readdirSync(folder).filter((f) => f.endsWith('.json')).map((f) => {
    const d = JSON.parse(fs.readFileSync(path.join(folder, f), 'utf8'));
    return { name: f.replace(/\.json$/, ''), groundId: d.groundId as string };
  }).filter((s) => !ONLY_SCENARIOS || ONLY_SCENARIOS.has(s.name));

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
    const content = `PERIOD ${period}\n\nTRANSCRIPT:\n${transcript}\n\nEXTRACTED RECORD:\n${recordText}${whatTheySaidThisWasFor(statedGoals)}`;
    const lastPeriod = await prisma.patternDetection.findMany({
      where: { participantId: checkIn.participantId, lastPeriodNumber: { gte: period - HOW_FAR_BACK, lte: period - 1 } },
      select: { code: true, observationText: true, lastPeriodNumber: true },
    });
    const block = lastPeriodBlockFor(whatWasSeenLastPeriod(lastPeriod, period), period);
    const deps = await prisma.groundDependency.findMany({
      where: { groundId: checkIn.groundId, fromParticipantId: checkIn.participantId },
      select: { onParticipantId: true, status: true, what: true },
    });
    return { content, block, statedGoals, lastPeriod, deps };
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
