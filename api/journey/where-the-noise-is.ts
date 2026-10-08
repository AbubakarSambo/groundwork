/**
 * WHERE THE NOISE IS IN A PATTERN READ (9 October 2026, pattern steadiness).
 *
 * For a few check-ins whose codes the stored reads kept in 8 to 22 of 30 reads, this takes N raw
 * extraction calls at the steady setting (before any filter), then, for each code, asks:
 *   - how many of the N raw extractions name the code (extraction noise),
 *   - the same observation text put to the confirming call M times (confirmation noise on IDENTICAL input),
 *   - and whether two extractions that name the code give the same observation text.
 * Nothing is written. Local gw_ database only.
 *   CHECKINS=id1,id2 N=12 M=4 DATABASE_URL=... GEMINI_LOCATION=global npx ts-node -T journey/where-the-noise-is.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { AnthropicService } from '../src/modules/conversation';
import { PatternsService, PATTERN_DETECTION_STEADY_OPTIONS } from '../src/modules/patterns/patterns.service';
import { TurnRole } from '@prisma/client';
import { periodOf } from '../src/modules/patterns/period-of';
import { whatWasSeenLastPeriod, lastPeriodBlockFor, HOW_FAR_BACK } from '../src/modules/patterns/the-detector-has-no-memory-of-last-period';
import { whatTheySaidThisWasFor } from '../src/modules/patterns/against-the-goal-they-stated';
import { PATTERN_DETECTION_PROMPT, PATTERN_DETECTION_SCHEMA, isBadFaithCode } from '../src/modules/patterns/pattern-library';
import { theirOwnEarlierRecord, earlierRecordQuery } from '../src/modules/patterns/the-detector-reads-their-own-earlier-record';

if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? '') || !/gw_/.test(process.env.DATABASE_URL ?? '')) { console.error('Refusing: local gw_ db only.'); process.exit(1); }
const N = Number(process.env.N ?? 12), M = Number(process.env.M ?? 4);
(async () => {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService); const model = app.get(AnthropicService); const patterns: any = app.get(PatternsService);
  for (const id of (process.env.CHECKINS ?? '').split(',').filter(Boolean)) {
    const ci: any = await prisma.checkIn.findUnique({ where: { id }, select: { id: true, groundId: true, participantId: true, sessionNumber: true, completedAt: true, startedAt: true, createdAt: true, ground: { select: { cadence: true } } } });
    const period = periodOf({ sessionNumber: ci.sessionNumber, when: ci.completedAt ?? ci.startedAt ?? ci.createdAt }, ci.ground);
    const [turns, records, goals, earlier, last] = await Promise.all([
      prisma.conversationTurn.findMany({ where: { checkInId: id }, orderBy: { createdAt: 'asc' } }),
      prisma.recordEntry.findMany({ where: { checkInId: id } }),
      prisma.recordEntry.findMany({ where: { participantId: ci.participantId, disputedAt: null, type: 'SUCCESS_DEFINITION' as any, checkIn: { sessionNumber: { lt: ci.sessionNumber } } }, orderBy: { createdAt: 'asc' }, select: { text: true }, take: 12 }),
      prisma.recordEntry.findMany(earlierRecordQuery(ci.participantId, ci.sessionNumber) as any),
      prisma.patternDetection.findMany({ where: { participantId: ci.participantId, lastPeriodNumber: { gte: period - HOW_FAR_BACK, lte: period - 1 } }, select: { code: true, observationText: true, lastPeriodNumber: true } }),
    ]);
    const transcript = turns.map((t) => `${t.role === TurnRole.AI ? 'GROUNDWORK' : 'PERSON'}: ${t.content}`).join('\n');
    const content = `PERIOD ${period}\n\nTRANSCRIPT:\n${transcript}\n\nEXTRACTED RECORD:\n${records.map((r) => `(${r.type}) ${r.text}`).join('\n')}${whatTheySaidThisWasFor(goals.map((g) => g.text))}${theirOwnEarlierRecord(earlier as any, period)}`;
    const block = lastPeriodBlockFor(whatWasSeenLastPeriod(last, period), period);
    const raws = await Promise.all(Array.from({ length: N }, () => model.extract<{ detections: { code: string; observation: string }[] }>(PATTERN_DETECTION_PROMPT + block, [{ role: 'user', content }], PATTERN_DETECTION_SCHEMA, PATTERN_DETECTION_STEADY_OPTIONS).catch(() => null)));
    const ok = raws.filter(Boolean) as any[];
    const byCode = new Map<string, string[]>();
    for (const r of ok) for (const d of r.detections ?? []) if (d.observation?.trim()) (byCode.get(d.code) ?? byCode.set(d.code, []).get(d.code)!).push(d.observation.trim());
    console.log(`\nCHECK-IN ${id} period ${period}: ${ok.length} extractions answered; the number of detections each gave: ${ok.map((r) => (r.detections ?? []).length).join(',')}`);
    for (const [code, obs] of [...byCode].sort((a, b) => b[1].length - a[1].length)) {
      if (!isBadFaithCode(code)) { console.log(`  ${code} (not confirmed): named in ${obs.length} of ${ok.length}`); continue; }
      const distinct = new Set(obs).size;
      const sample = obs[0];
      const conf = await Promise.all(Array.from({ length: M }, () => patterns.confirmDetection(code, sample, PATTERN_DETECTION_STEADY_OPTIONS).catch(() => null)));
      const confSecond = obs.length > 1 ? await Promise.all(Array.from({ length: M }, () => patterns.confirmDetection(code, obs[obs.length - 1], PATTERN_DETECTION_STEADY_OPTIONS).catch(() => null))) : [];
      console.log(`  ${code}: named in ${obs.length} of ${ok.length} extractions (${distinct} distinct wordings); confirming the SAME first wording ${M} times: ${conf.map((c) => (c === null ? '?' : c ? 'Y' : 'N')).join('')}; the last wording: ${confSecond.map((c) => (c === null ? '?' : c ? 'Y' : 'N')).join('')}`);
    }
  }
  await app.close(); process.exit(0);
})();
