import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnthropicService } from '../conversation';
import { PatternStatus, TurnRole } from '@prisma/client';
import { PATTERN_DETECTION_PROMPT, PATTERN_DETECTION_SCHEMA, isBadFaithCode } from './pattern-library';

const THREE_PERIOD_RULE = 3;

/**
 * Pattern detection. Behavioural signals across check-in PERIODS — never a
 * verdict on a person (Part 4). A code only surfaces after it has been observed
 * in three CONSECUTIVE periods (THREE PERIOD RULE; a gap resets the streak).
 * The API exposes the plain observationText, never the code as a score/list.
 */
@Injectable()
export class PatternsService {
  private readonly logger = new Logger(PatternsService.name);

  constructor(
    private prisma: PrismaService,
    private anthropic: AnthropicService,
  ) {}

  /**
   * Analyse one completed check-in (one period for one party). Extracts pattern
   * signals from this party's own transcript + record and feeds them through
   * the three-period rule. Idempotent: skips already-analysed check-ins.
   */
  async analyzeCheckIn(checkInId: string): Promise<void> {
    const checkIn = await this.prisma.checkIn.findUnique({ where: { id: checkInId } });
    if (!checkIn || checkIn.patternsAnalyzedAt) return;

    const [turns, records] = await Promise.all([
      this.prisma.conversationTurn.findMany({ where: { checkInId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.recordEntry.findMany({ where: { checkInId } }),
    ]);

    if (turns.length === 0 && records.length === 0) {
      await this.markAnalyzed(checkInId);
      return;
    }

    const transcript = turns.map((t) => `${t.role === TurnRole.AI ? 'GROUNDWORK' : 'PERSON'}: ${t.content}`).join('\n');
    const recordText = records.map((r) => `(${r.type}) ${r.text}`).join('\n');
    const content = `PERIOD ${checkIn.sessionNumber}\n\nTRANSCRIPT:\n${transcript}\n\nEXTRACTED RECORD:\n${recordText}`;

    try {
      const result = await this.anthropic.extract<{ detections: { code: string; observation: string }[] }>(
        PATTERN_DETECTION_PROMPT,
        [{ role: 'user', content }],
        PATTERN_DETECTION_SCHEMA,
      );

      for (const d of result?.detections ?? []) {
        if (!d.observation?.trim() || !isBadFaithCode(d.code)) continue;
        await this.observe(checkIn.groundId, checkIn.participantId, d.code, d.observation.trim(), checkIn.sessionNumber);
      }
    } catch (err: any) {
      this.logger.error(`Pattern extraction failed for check-in ${checkInId}: ${err.message}`);
    }

    await this.markAnalyzed(checkInId);
  }

  /**
   * Record an observed signal for a participant in a given period. Enforces the
   * three-period rule with consecutive periods: a gap resets the streak; the
   * status flips to SURFACED only at three consecutive periods.
   */
  async observe(groundId: string, participantId: string, code: string, observationText: string, periodNumber: number) {
    const existing = await this.prisma.patternDetection.findUnique({
      where: { participantId_code: { participantId, code } },
    });

    if (!existing) {
      return this.prisma.patternDetection.create({
        data: { groundId, participantId, code, observationText, periodsObserved: 1, lastPeriodNumber: periodNumber, status: PatternStatus.CANDIDATE },
      });
    }

    const last = existing.lastPeriodNumber ?? 0;

    // Stale / already counted for this or an earlier period — ignore.
    if (periodNumber <= last) return existing;

    // Consecutive period — extend the streak.
    if (periodNumber === last + 1) {
      const periodsObserved = existing.periodsObserved + 1;
      return this.prisma.patternDetection.update({
        where: { id: existing.id },
        data: {
          periodsObserved,
          lastPeriodNumber: periodNumber,
          lastSeenAt: new Date(),
          observationText,
          status: periodsObserved >= THREE_PERIOD_RULE ? PatternStatus.SURFACED : PatternStatus.CANDIDATE,
        },
      });
    }

    // Gap in periods — the streak broke. Reset (never accelerate detection).
    return this.prisma.patternDetection.update({
      where: { id: existing.id },
      data: { periodsObserved: 1, lastPeriodNumber: periodNumber, lastSeenAt: new Date(), observationText, status: PatternStatus.CANDIDATE },
    });
  }

  /**
   * Surfaced observations for a ground — plain language only. Never the raw
   * codes, never a count, never a verdict, never who said what.
   */
  async surfacedForGround(groundId: string) {
    const surfaced = await this.prisma.patternDetection.findMany({
      where: { groundId, status: PatternStatus.SURFACED },
      select: { observationText: true, lastSeenAt: true },
      orderBy: { lastSeenAt: 'desc' },
    });
    return surfaced.map((s) => ({ observation: s.observationText, lastSeenAt: s.lastSeenAt }));
  }

  private markAnalyzed(checkInId: string) {
    return this.prisma.checkIn.update({ where: { id: checkInId }, data: { patternsAnalyzedAt: new Date() } });
  }
}
