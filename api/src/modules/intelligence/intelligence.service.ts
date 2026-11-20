import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckInStatus, GroundStatus, PatternStatus } from '@prisma/client';

/**
 * The learning loop + cross-org intelligence. When a ground resolves, its
 * outcome is recorded against the prompt version that produced it (every change
 * versioned against outcome data - the moat). Both parties answer one yes/no -
 * did this process help you reach a decision that felt fair and grounded in
 * evidence? - which becomes the outcome rate per prompt version. Cross-org
 * summaries are ANONYMISED: no names, no PII, only patterns.
 */
@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Record the structural data point on resolution: prompt version, moment, end
   * state, session count. Called from ResolutionService.finalize().
   */
  async recordOutcome(groundId: string, resolvedState: string, resolvable?: boolean, notes?: string) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId } });
    if (!ground) throw new Error('Ground not found');

    const sessionCount = await this.prisma.checkIn.count({ where: { groundId, status: CheckInStatus.COMPLETED } });

    return this.prisma.outcome.upsert({
      where: { groundId },
      create: { groundId, promptVersionId: ground.promptVersionId, resolvedState, moment: ground.moment, sessionCount, resolvable, notes },
      update: { resolvedState, moment: ground.moment, sessionCount, resolvable, notes },
    });
  }

  /**
   * A party's post-resolution feedback - the seed of the learning loop. Only a
   * party to the ground may submit, and only once the ground has closed.
   */
  async submitFeedback(groundId: string, userId: string, feltFair: boolean, note?: string) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId } });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    const participant = await this.prisma.groundParticipant.findFirst({ where: { groundId, userId } });
    if (!participant) throw new ForbiddenException('You are not one of the people in this check-in, so ask whoever runs it to add you.');

    return this.prisma.outcomeFeedback.upsert({
      where: { groundId_participantId: { groundId, participantId: participant.id } },
      create: { groundId, participantId: participant.id, feltFair, note },
      update: { feltFair, note },
    });
  }

  /**
   * Rich outcome feedback - POST /grounds/:id/feedback.
   * Accepts a structured rating object and maps to the OutcomeFeedback model.
   * Gate: only a party to the ground may submit. Gate: one submission per ground
   * per party (enforced by the @@unique on the model).
   *
   * Fields mapping:
   *   feltFair      ← wouldUseAgain (primary satisfaction signal)
   *   note          ← JSON-encoded bag of { rating, whatWorked, whatDidnt }
   *                   so the richer data is preserved without a schema migration.
   */
  async submitOutcomeFeedback(
    groundId: string,
    userId: string,
    dto: { rating: number; feltFair: boolean; whatWorked?: string; whatDidnt?: string; wouldUseAgain: boolean },
  ) {
    const ground = await this.prisma.ground.findUnique({ where: { id: groundId } });
    if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');

    const participant = await this.prisma.groundParticipant.findFirst({ where: { groundId, userId } });
    if (!participant) throw new ForbiddenException('You are not one of the people in this check-in, so ask whoever runs it to add you.');

    // Enforce one-submission-per-ground guard (in addition to the DB unique constraint).
    const existing = await this.prisma.outcomeFeedback.findUnique({
      where: { groundId_participantId: { groundId, participantId: participant.id } },
    });
    if (existing) throw new ForbiddenException('You have already given your feedback on this check-in, so there is nothing more to send.');

    // wouldUseAgain lives in the note with the rest of the survey. It used to be
    // written into the feltFair COLUMN, which is the column every fairness
    // metric reads - see the note on GroundFeedbackDto. Keeping it here means
    // the answer is still recorded and still analysable, without standing in for
    // a question it is not.
    const note = JSON.stringify({
      rating: dto.rating,
      whatWorked: dto.whatWorked ?? null,
      whatDidnt: dto.whatDidnt ?? null,
      wouldUseAgain: dto.wouldUseAgain,
    });

    return this.prisma.outcomeFeedback.create({
      data: {
        groundId,
        participantId: participant.id,
        // The answer to the fairness question, and nothing else.
        feltFair: dto.feltFair,
        note,
      },
    });
  }

  /** Has the requesting party already given feedback for this ground? */
  async myFeedback(groundId: string, userId: string) {
    const participant = await this.prisma.groundParticipant.findFirst({ where: { groundId, userId } });
    if (!participant) return null;
    return this.prisma.outcomeFeedback.findUnique({ where: { groundId_participantId: { groundId, participantId: participant.id } } });
  }

  // --- Dashboard: two views (Part 5) ---

  /**
   * Ground activity view. Session-2 rate is the single most important
   * conversion metric - below 60% means session 1 is not producing enough
   * surprise to bring people back.
   */
  async groundActivity(organizationId: string) {
    const [active, reportReady, resolved, total] = await Promise.all([
      this.prisma.ground.count({ where: { organizationId, status: GroundStatus.ACTIVE } }),
      this.prisma.ground.count({ where: { organizationId, status: GroundStatus.REPORT_READY } }),
      this.prisma.ground.count({ where: { organizationId, status: { in: [GroundStatus.RESOLVED, GroundStatus.CLOSED] } } }),
      this.prisma.ground.count({ where: { organizationId } }),
    ]);

    // Session-2 rate: of participants who completed session 1, how many also
    // completed session 2.
    const s1 = await this.prisma.checkIn.count({
      where: { sessionNumber: 1, status: CheckInStatus.COMPLETED, ground: { organizationId } },
    });
    const s2 = await this.prisma.checkIn.count({
      where: { sessionNumber: 2, status: CheckInStatus.COMPLETED, ground: { organizationId } },
    });
    const session2Rate = s1 > 0 ? Math.round((s2 / s1) * 100) : null;

    return { active, reportReady, resolved, total, session1Completions: s1, session2Completions: s2, session2Rate };
  }

  /**
   * Outcome & learning view. Outcome rate per prompt version - when a prompt
   * changes, this shows whether it improved the rate. The ROI story after 50
   * resolved grounds.
   */
  async outcomeRates(organizationId: string) {
    const outcomes = await this.prisma.outcome.findMany({
      where: { ground: { organizationId } },
      select: { groundId: true, promptVersionId: true },
    });

    const feedback = await this.prisma.outcomeFeedback.findMany({
      where: { ground: { organizationId } },
      select: { groundId: true, feltFair: true },
    });
    const fairByGround = new Map<string, { fair: number; total: number }>();
    for (const f of feedback) {
      const e = fairByGround.get(f.groundId) ?? { fair: 0, total: 0 };
      e.total += 1;
      if (f.feltFair) e.fair += 1;
      fairByGround.set(f.groundId, e);
    }

    const versionIds = [...new Set(outcomes.map((o) => o.promptVersionId).filter(Boolean) as string[])];
    const versions = await this.prisma.promptVersion.findMany({ where: { id: { in: versionIds } }, select: { id: true, key: true, version: true } });
    const versionMap = new Map(versions.map((v) => [v.id, v]));

    const byVersion = new Map<string, { key: string; version: number; resolvedCount: number; fairResponses: number; totalResponses: number }>();
    for (const o of outcomes) {
      const key = o.promptVersionId ?? 'unversioned';
      const v = o.promptVersionId ? versionMap.get(o.promptVersionId) : undefined;
      const e = byVersion.get(key) ?? { key: v?.key ?? 'unversioned', version: v?.version ?? 0, resolvedCount: 0, fairResponses: 0, totalResponses: 0 };
      e.resolvedCount += 1;
      const fb = fairByGround.get(o.groundId);
      if (fb) { e.fairResponses += fb.fair; e.totalResponses += fb.total; }
      byVersion.set(key, e);
    }

    return [...byVersion.values()].map((e) => ({
      key: e.key,
      version: e.version,
      resolvedCount: e.resolvedCount,
      responses: e.totalResponses,
      fairnessRate: e.totalResponses > 0 ? Math.round((e.fairResponses / e.totalResponses) * 100) : null,
    }));
  }
}
