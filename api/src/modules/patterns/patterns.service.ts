import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnthropicService } from '../conversation';
import { runIntake } from '../conversation/intake';
import { PatternStatus, TurnRole, GroundStatus, CheckInStatus } from '@prisma/client';
import {
  PATTERN_DETECTION_PROMPT,
  PATTERN_DETECTION_SCHEMA,
  BAD_FAITH_CODES,
  isBadFaithCode,
  detectR3,
  checkF1Conditions,
  DetectionInput,
} from './pattern-library';

/** Lookup map from code -> description for the AI confirmation prompt. */
const CODE_DESCRIPTIONS = new Map(BAD_FAITH_CODES.map((c) => [c.code, `${c.name}: ${c.signal}`]));

const THREE_PERIOD_RULE = 3;

// Grounds still in motion.
const ACTIVE_STATUSES: GroundStatus[] = [
  GroundStatus.AWAITING_PARTIES,
  GroundStatus.REPORT_READY,
  GroundStatus.ACTIVE,
];

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
    const checkIn = await this.prisma.checkIn.findUnique({
      where: { id: checkInId },
      select: {
        id: true, groundId: true, participantId: true, sessionNumber: true,
        patternsAnalyzedAt: true, specificityDimensions: true,
      },
    });
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

    // --- R3 positive signal (rule-based, no AI extraction needed) ---
    const allPriorText = records.map((r) => r.text);
    const r3Input: DetectionInput = { submissions: allPriorText };
    if (detectR3(r3Input)) {
      await this.observePositive(
        checkIn.groundId,
        checkIn.participantId,
        'R3',
        'The record names another person positively with specific evidence of their contribution.',
        checkIn.sessionNumber,
      );
    }

    try {
      const result = await this.anthropic.extract<{ detections: { code: string; observation: string }[] }>(
        PATTERN_DETECTION_PROMPT,
        [{ role: 'user', content }],
        PATTERN_DETECTION_SCHEMA,
      );

      for (const d of result?.detections ?? []) {
        if (!d.observation?.trim() || !isBadFaithCode(d.code)) continue;
        // AI confirmation gate: each candidate pattern is confirmed by a
        // second AI call before being written to the record. This prevents
        // false positives from the batch extraction step.
        const confirmed = await this.confirmDetection(d.code, d.observation.trim()).catch((err) => {
          this.logger.warn(`Pattern confirmation skipped for ${d.code}: ${err.message}`);
          return false;
        });
        if (!confirmed) continue;

        // Gap #30 — F1 composite gate: F1 (Insight Without Operation) requires
        // ALL four conditions (high thinking-language, low output-language,
        // pattern sustained 3 periods, no change after prior surfacing). The AI
        // extraction pass can flag F1 too early; we enforce the composite rule
        // here using per-participant historical scores before accepting the signal.
        if (d.code === 'F1') {
          const f1Input = await this.buildF1Input(checkIn.participantId);
          if (!checkF1Conditions(f1Input)) {
            this.logger.debug(`F1 gate: composite conditions not met for participant ${checkIn.participantId} — skipping`);
            continue;
          }
        }

        await this.observe(checkIn.groundId, checkIn.participantId, d.code, d.observation.trim(), checkIn.sessionNumber);
      }
    } catch (err: any) {
      this.logger.error(`Pattern extraction failed for check-in ${checkInId}: ${err.message}`);
    }

    // LOW_SPEC_MULTI_DIM: alignment-feed-only flag when 3+ dimensions were vague/managed.
    // Surfaces immediately (observePositive) so the admin sees it in the current period.
    // Never surfaces to the participant in conversation (filtered by ALIGNMENT_FEED_ONLY_CODES).
    if (checkIn.specificityDimensions) {
      const dims = checkIn.specificityDimensions as Record<string, string>;
      const lowCount = Object.values(dims).filter((v) => v === 'vague' || v === 'managed').length;
      if (lowCount >= 3) {
        const next = checkIn.sessionNumber + 1;
        const obsText =
          `Session ${checkIn.sessionNumber} produced limited specificity across multiple dimensions. ` +
          `Session ${next} will use a different approach.`;
        await this.observePositive(checkIn.groundId, checkIn.participantId, 'LOW_SPEC_MULTI_DIM', obsText, checkIn.sessionNumber);
      }
    }

    await this.markAnalyzed(checkInId);
  }

  /**
   * Record an observed signal for a participant in a given period. Enforces the
   * three-period rule with consecutive periods: a gap resets the streak; the
   * status flips to SURFACED only at three consecutive periods.
   *
   * Gap #21 — consecutivePeriods counter: if the incoming period is not exactly
   * lastPeriodNumber + 1 (a gap), the streak resets to 1 and the detection
   * stays CANDIDATE regardless of total periodsObserved.
   */
  async observe(groundId: string, participantId: string, code: string, observationText: string, periodNumber: number) {
    const existing = await this.prisma.patternDetection.findUnique({
      where: { participantId_code: { participantId, code } },
    });

    if (!existing) {
      return this.prisma.patternDetection.create({
        data: {
          groundId,
          participantId,
          code,
          observationText,
          periodsObserved: 1,
          lastPeriodNumber: periodNumber,
          status: PatternStatus.CANDIDATE,
        },
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
          // Three-period rule: SURFACED only after THREE consecutive periods.
          status: periodsObserved >= THREE_PERIOD_RULE ? PatternStatus.SURFACED : PatternStatus.CANDIDATE,
        },
      });
    }

    // Gap in periods — the consecutive streak broke. Reset to 1 (never accelerate
    // detection; periodsObserved is the consecutive count, not a lifetime count).
    return this.prisma.patternDetection.update({
      where: { id: existing.id },
      data: {
        periodsObserved: 1,
        lastPeriodNumber: periodNumber,
        lastSeenAt: new Date(),
        observationText,
        status: PatternStatus.CANDIDATE,
      },
    });
  }

  /**
   * Record a positive signal (e.g. R3) for a participant. Positive signals are
   * surfaced immediately — they are not subject to the three-period rule.
   */
  async observePositive(
    groundId: string,
    participantId: string,
    code: string,
    observationText: string,
    periodNumber: number,
  ) {
    const existing = await this.prisma.patternDetection.findUnique({
      where: { participantId_code: { participantId, code } },
    });

    if (!existing) {
      return this.prisma.patternDetection.create({
        data: {
          groundId,
          participantId,
          code,
          observationText,
          periodsObserved: 1,
          lastPeriodNumber: periodNumber,
          // Positive signals surface immediately.
          status: PatternStatus.SURFACED,
        },
      });
    }

    if (periodNumber <= (existing.lastPeriodNumber ?? 0)) return existing;

    return this.prisma.patternDetection.update({
      where: { id: existing.id },
      data: {
        periodsObserved: existing.periodsObserved + 1,
        lastPeriodNumber: periodNumber,
        lastSeenAt: new Date(),
        observationText,
        status: PatternStatus.SURFACED,
      },
    });
  }

  /**
   * Gap #21 — surfacePatterns(): enforce the three-period rule across ALL
   * CANDIDATE detections for a ground. Any detection that has been observed in
   * exactly THREE consecutive periods is transitioned to SURFACED; any whose
   * consecutive streak is broken is left as CANDIDATE with its counter reset.
   *
   * This is the explicit promotion pass. It is safe to call multiple times —
   * already-SURFACED detections are skipped.
   */
  async surfacePatterns(groundId: string): Promise<void> {
    const candidates = await this.prisma.patternDetection.findMany({
      where: { groundId, status: PatternStatus.CANDIDATE },
    });

    for (const det of candidates) {
      if (det.periodsObserved >= THREE_PERIOD_RULE) {
        await this.prisma.patternDetection.update({
          where: { id: det.id },
          data: { status: PatternStatus.SURFACED },
        });
      }
    }
  }

  /**
   * Gap #22 — startNewPeriod(groundId):
   *   1. Archives (marks with period tag in observationText) current CANDIDATE
   *      detections so they are queryable by period.
   *   2. Resets per-period counters for detections that did NOT fire in the
   *      most recent period (consecutive streak broken by a missed period).
   *   3. Runs surfacePatterns() to promote any detection that has now reached
   *      THREE consecutive periods.
   *
   * "Archiving" here means appending a "[period=N]" prefix to observationText
   * so that historical period membership is preserved without a schema change.
   */
  async startNewPeriod(groundId: string): Promise<void> {
    // Determine the current highest period number in use for this ground.
    const latest = await this.prisma.checkIn.findFirst({
      where: { groundId },
      orderBy: { sessionNumber: 'desc' },
      select: { sessionNumber: true },
    });
    const currentPeriod = latest?.sessionNumber ?? 0;

    // 1. Tag CANDIDATE detections with their period number if not yet tagged.
    const candidates = await this.prisma.patternDetection.findMany({
      where: { groundId, status: PatternStatus.CANDIDATE },
    });

    for (const det of candidates) {
      const periodTag = `[period=${det.lastPeriodNumber ?? currentPeriod}]`;
      const alreadyTagged = det.observationText?.startsWith('[period=') ?? false;
      if (!alreadyTagged) {
        await this.prisma.patternDetection.update({
          where: { id: det.id },
          data: {
            observationText: `${periodTag} ${det.observationText ?? ''}`.trim(),
          },
        });
      }

      // 2. If this detection's last period is not the current period, the streak
      //    is broken — reset the consecutive counter back to 0 so the next
      //    observation restarts the streak properly.
      const lastP = det.lastPeriodNumber ?? 0;
      if (lastP < currentPeriod) {
        await this.prisma.patternDetection.update({
          where: { id: det.id },
          data: { periodsObserved: 0 },
        });
      }
    }

    // 3. Promote any detections that now meet the three-period threshold.
    await this.surfacePatterns(groundId);

    this.logger.log(`startNewPeriod: ground ${groundId}, period boundary at session ${currentPeriod}`);
  }

  /**
   * Gap #29 — detectConcentrationRisk(orgId):
   * Detects when a single person (by userId) appears as a participant in 3 or
   * more active grounds simultaneously within the same organisation. When
   * detected, creates a CONCENTRATION_RISK PatternDetection on one of those
   * grounds (the earliest) so it surfaces in the alignment feed.
   */
  async detectConcentrationRisk(orgId: string): Promise<void> {
    // Find all active grounds for the org.
    const activeGrounds = await this.prisma.ground.findMany({
      where: { organizationId: orgId, status: { in: ACTIVE_STATUSES } },
      select: {
        id: true,
        participants: {
          where: { userId: { not: null } },
          select: { id: true, userId: true },
        },
      },
    });

    // Count how many active grounds each userId appears in.
    const groundsByUser = new Map<string, { groundId: string; participantId: string }[]>();
    for (const ground of activeGrounds) {
      for (const p of ground.participants) {
        if (!p.userId) continue;
        const entry = { groundId: ground.id, participantId: p.id };
        const existing = groundsByUser.get(p.userId) ?? [];
        existing.push(entry);
        groundsByUser.set(p.userId, existing);
      }
    }

    for (const [userId, entries] of groundsByUser) {
      if (entries.length < 3) continue;

      // Use the first entry as the anchor ground for this detection.
      const anchor = entries[0];
      const observationText =
        `A single participant (user ${userId}) is an active party in ${entries.length} simultaneous grounds ` +
        `within this organisation. Concentration in multiple active grounds at once may indicate over-extension ` +
        `or undue influence across proceedings.`;

      const existingRisk = await this.prisma.patternDetection.findUnique({
        where: { participantId_code: { participantId: anchor.participantId, code: 'CONCENTRATION_RISK' } },
      });

      if (!existingRisk) {
        await this.prisma.patternDetection.create({
          data: {
            groundId: anchor.groundId,
            participantId: anchor.participantId,
            code: 'CONCENTRATION_RISK',
            observationText,
            periodsObserved: 1,
            status: PatternStatus.SURFACED,
          },
        });
        this.logger.warn(
          `Concentration risk detected: user ${userId} active in ${entries.length} grounds (org ${orgId})`,
        );
      } else {
        // Update the observation if the count changed.
        await this.prisma.patternDetection.update({
          where: { id: existingRisk.id },
          data: { observationText, lastSeenAt: new Date() },
        });
      }
    }
  }

  /**
   * Gap #32 — Org-wide mention tracking for Degree 3 cross-reference.
   * Returns all record entries from ALL grounds in the given organisation where
   * the specified participant email is mentioned, so cross-ground mention
   * patterns can be detected across the entire org rather than a single ground.
   */
  async getOrgWideMentions(orgId: string, mentionEmail: string): Promise<{ groundId: string; text: string }[]> {
    // Get all participants across the org whose email matches.
    const orgGrounds = await this.prisma.ground.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    });
    const groundIds = orgGrounds.map((g) => g.id);

    if (groundIds.length === 0) return [];

    // Query record entries from all grounds in the org and filter by mention
    // of the target email or name fragment in the text. Because names are
    // free-text we search for the email prefix (the local part before @) as a
    // pragmatic proxy for name mentions.
    const namePart = mentionEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').toLowerCase();

    const entries = await this.prisma.recordEntry.findMany({
      where: {
        participant: { groundId: { in: groundIds } },
        text: { contains: namePart, mode: 'insensitive' },
      },
      select: { text: true, participant: { select: { groundId: true } } },
    });

    return entries.map((e) => ({ groundId: e.participant.groundId, text: e.text }));
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

  /**
   * Gap #30 — Build a DetectionInput for the F1 composite check using the
   * participant's historical check-in data. Scores are computed on-the-fly from
   * each period's record entries using runIntake() (scores are not persisted on
   * the CheckIn model). Includes prior surfaced codes so condition 4 can be
   * evaluated (no change despite prior F1 surfacing).
   */
  private async buildF1Input(participantId: string): Promise<DetectionInput> {
    const checkIns = await this.prisma.checkIn.findMany({
      where: { participantId, status: CheckInStatus.COMPLETED },
      orderBy: { sessionNumber: 'asc' },
      select: {
        id: true,
        recordEntries: { select: { text: true } },
      },
    });

    const submissions: string[] = [];
    const thinkingScore: number[] = [];
    const outputScore: number[] = [];

    for (const ci of checkIns) {
      const periodText = ci.recordEntries.map((r) => r.text).join(' ');
      const intake = runIntake(periodText);
      submissions.push(periodText);
      thinkingScore.push(intake.thinkingScore);
      outputScore.push(intake.outputScore);
    }

    // Collect codes already surfaced for this participant (condition 4).
    const surfaced = await this.prisma.patternDetection.findMany({
      where: { participantId, status: PatternStatus.SURFACED },
      select: { code: true },
    });
    const priorSurfacedCodes = surfaced.map((s) => s.code);

    return { submissions, thinkingScore, outputScore, priorSurfacedCodes };
  }

  /**
   * Ask the AI to confirm a single candidate pattern detection before saving.
   * Returns true only if the model answers YES. Any other response or an error
   * is treated as rejection so we fail safely (no false positives).
   *
   * The excerpt is the observation text produced by the batch extraction step —
   * a plain-language description of what the record shows, never a verdict.
   */
  private async confirmDetection(code: string, excerpt: string): Promise<boolean> {
    const description = CODE_DESCRIPTIONS.get(code) ?? code;
    const systemPrompt =
      'You are a pattern-detection verifier. Answer only YES or NO. No explanation. No preamble.';
    const question = `Does this text exhibit pattern ${code} (${description})?\nText: ${excerpt}\nAnswer YES or NO.`;

    const reply = await this.anthropic.respond(systemPrompt, [{ role: 'user', content: question }]);
    return reply.trim().toUpperCase().startsWith('YES');
  }

  private markAnalyzed(checkInId: string) {
    return this.prisma.checkIn.update({ where: { id: checkInId }, data: { patternsAnalyzedAt: new Date() } });
  }
}
