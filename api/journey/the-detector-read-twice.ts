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
 * Usage (from api/, local test database only):
 *   DATABASE_URL=postgresql://hafsahjumare@localhost:5432/gw_pw9_1786222102 \
 *     npx ts-node -T journey/the-detector-read-twice.ts all-24/run-20
 */
import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { AnthropicService } from '../src/modules/conversation';
import { PatternsService } from '../src/modules/patterns/patterns.service';
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

interface ARead { raw: Set<string>; kept: Set<string> }

async function main() {
  const folder = path.resolve(__dirname, process.argv[2] ?? 'all-24/run-20');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);
  const model = app.get(AnthropicService);
  const patterns: any = app.get(PatternsService);

  const scenarios = fs.readdirSync(folder).filter((f) => f.endsWith('.json')).map((f) => {
    const d = JSON.parse(fs.readFileSync(path.join(folder, f), 'utf8'));
    return { name: f.replace(/\.json$/, ''), groundId: d.groundId as string };
  });

  async function readOnce(checkIn: any, content: string, block: string, statedGoals: string[], lastPeriod: any[], deps: any[]): Promise<ARead> {
    const result = await model.extract<{ detections: { code: string; observation: string }[] }>(
      PATTERN_DETECTION_PROMPT + block, [{ role: 'user', content }], PATTERN_DETECTION_SCHEMA,
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
      const confirmed = await patterns.confirmDetection(d.code, d.observation.trim()).catch(() => false);
      if (confirmed) kept.add(d.code);
    }
    return { raw, kept };
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
      const period = periodOf({ sessionNumber: checkIn.sessionNumber, when: checkIn.completedAt ?? checkIn.startedAt ?? checkIn.createdAt }, checkIn.ground);
      const [turns, records, goals] = await Promise.all([
        prisma.conversationTurn.findMany({ where: { checkInId: checkIn.id }, orderBy: { createdAt: 'asc' } }),
        prisma.recordEntry.findMany({ where: { checkInId: checkIn.id } }),
        prisma.recordEntry.findMany({
          where: { participantId: checkIn.participantId, disputedAt: null, type: 'SUCCESS_DEFINITION' as any, checkIn: { sessionNumber: { lt: checkIn.sessionNumber } } },
          orderBy: { createdAt: 'asc' }, select: { text: true }, take: 12,
        }),
      ]);
      if (turns.length === 0 && records.length === 0) return;
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
      const [a, b] = await Promise.all([
        readOnce(checkIn, content, block, statedGoals, lastPeriod, deps),
        readOnce(checkIn, content, block, statedGoals, lastPeriod, deps),
      ]);
      const person = (checkIn.participant?.user?.email ?? 'unknown').split('@')[0].split('.')[0];
      perCheckIn.push({ scenario: s.name, person, session: checkIn.sessionNumber, a, b });
    }));
    process.stderr.write(`read ${s.name}\n`);
  }

  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const mean = (xs: number[]) => (xs.length ? xs.reduce((p, q) => p + q, 0) / xs.length : 1);
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

  console.log(`Check-ins read twice: ${perCheckIn.length}`);
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
