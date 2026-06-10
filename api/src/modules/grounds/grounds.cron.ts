import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService, CronLock } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { GroundworkEvents, CheckInCompletedEvent } from '../../common';
import { GroundStatus, CheckInStatus, PartyType } from '@prisma/client';

const TERMINAL: GroundStatus[] = [GroundStatus.RESOLVED, GroundStatus.CLOSED, GroundStatus.STALLED];
const NUDGE_THROTTLE_DAYS = 3;
const OPEN_STATUSES: CheckInStatus[] = [CheckInStatus.NOT_STARTED, CheckInStatus.IN_PROGRESS];

@Injectable()
export class GroundsCron {
  private readonly logger = new Logger(GroundsCron.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private config: ConfigService,
    private events: EventEmitter2,
  ) {}

  /**
   * Daily sweep: transition any ground past its timelineDays to STALLED.
   * Billing stops automatically because the monthly cron only queries ACTIVE grounds.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async stallOverdueGrounds() {
    await this.prisma.withAdvisoryLock(CronLock.STALL_GROUNDS, async () => {
      const candidates = await this.prisma.ground.findMany({
        where: { status: { notIn: TERMINAL } },
        select: { id: true, createdAt: true, timelineDays: true },
      });

      const staleIds = candidates
        .filter((g) => {
          const deadline = new Date(g.createdAt.getTime() + g.timelineDays * 24 * 60 * 60 * 1000);
          return deadline < new Date();
        })
        .map((g) => g.id);

      if (staleIds.length === 0) return;

      await this.prisma.ground.updateMany({
        where: { id: { in: staleIds } },
        data: { status: GroundStatus.STALLED },
      });

      this.logger.warn(`Stalled ${staleIds.length} overdue ground(s): ${staleIds.join(', ')}`);

      // GW-06: notify all parties that their ground has stalled.
      const stalledGrounds = await this.prisma.ground.findMany({
        where: { id: { in: staleIds } },
        select: { id: true, label: true, participants: { select: { email: true } } },
      });
      const frontend = this.config.get<string>('resend.frontendUrl') || '';
      for (const g of stalledGrounds) {
        for (const p of g.participants) {
          await this.email
            .sendStalledNotification(p.email, g.label, `${frontend}/grounds/${g.id}`)
            .catch((err: any) => this.logger.error(`Stalled notification failed for ground ${g.id}: ${err.message}`));
        }
      }
    });
  }

  /**
   * Daily reminders (B1) — grounds die silently without them. Two kinds, both
   * throttled to once per NUDGE_THROTTLE_DAYS per party via lastNudgedAt:
   *   1. Return-nudge: an accepted party with an open, now-due session that
   *      hasn't been completed — bring them back.
   *   2. Activation reminder: a REPORT_READY ground the admin hasn't activated —
   *      remind the initiator the report is waiting.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendReminders() {
    await this.prisma.withAdvisoryLock(CronLock.SEND_REMINDERS, async () => this.sendRemindersInner());
  }

  private async sendRemindersInner() {
    const now = new Date();
    const throttleBefore = new Date(now.getTime() - NUDGE_THROTTLE_DAYS * 24 * 60 * 60 * 1000);
    const frontend = this.config.get<string>('resend.frontendUrl') || '';

    // 1. Return-nudges to idle accepted parties with a due, open session.
    const idleParties = await this.prisma.groundParticipant.findMany({
      where: {
        userId: { not: null },
        ground: { status: { notIn: TERMINAL } },
        OR: [{ lastNudgedAt: null }, { lastNudgedAt: { lt: throttleBefore } }],
        checkIns: { some: { status: { in: OPEN_STATUSES } } },
      },
      select: {
        id: true,
        email: true,
        ground: { select: { label: true } },
        checkIns: {
          where: { status: { in: OPEN_STATUSES } },
          orderBy: { sessionNumber: 'asc' },
          take: 1,
          select: { id: true, availableFrom: true },
        },
        // GW-23: use the person's last record entry as the "specific thing" in the nudge
        // so the email names something real from their own words rather than the ground label.
        recordEntries: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { text: true },
        },
      },
    });

    let returnNudges = 0;
    for (const p of idleParties) {
      const ci = p.checkIns[0];
      if (!ci) continue;
      if (ci.availableFrom && ci.availableFrom > now) continue; // not due yet
      const specificThing = p.recordEntries[0]?.text ?? p.ground.label;
      try {
        await this.email.sendNudge(p.email, specificThing, `${frontend}/checkin/${ci.id}`);
        await this.prisma.groundParticipant.update({ where: { id: p.id }, data: { lastNudgedAt: now } });
        returnNudges++;
      } catch (err: any) {
        this.logger.error(`Return-nudge failed for participant ${p.id}: ${err.message}`);
      }
    }

    // 2. Activation reminders to admins sitting on an unactivated report.
    const reportReady = await this.prisma.ground.findMany({
      where: { status: GroundStatus.REPORT_READY, billingActivatedAt: null },
      select: {
        id: true,
        label: true,
        participants: {
          where: { partyType: PartyType.INITIATOR },
          select: { id: true, email: true, lastNudgedAt: true },
          take: 1,
        },
      },
    });

    let activationNudges = 0;
    for (const g of reportReady) {
      const initiator = g.participants[0];
      if (!initiator) continue;
      if (initiator.lastNudgedAt && initiator.lastNudgedAt >= throttleBefore) continue;
      try {
        await this.email.sendActivationReminder(initiator.email, g.label, `${frontend}/grounds/${g.id}`);
        await this.prisma.groundParticipant.update({ where: { id: initiator.id }, data: { lastNudgedAt: now } });
        activationNudges++;
      } catch (err: any) {
        this.logger.error(`Activation reminder failed for ground ${g.id}: ${err.message}`);
      }
    }

    if (returnNudges || activationNudges) {
      this.logger.log(`Reminders sent — ${returnNudges} return-nudge(s), ${activationNudges} activation reminder(s).`);
    }
  }

  /**
   * GW-06 synthesis backstop — 4 AM daily. If the CHECK_IN_COMPLETED event
   * was lost (e.g. a crash between session completion and synthesis), an ACTIVE
   * ground can sit with both parties done and no report. This sweep finds that
   * state and re-emits the event; the reports listener is idempotent so re-fire
   * is safe.
   */
  @Cron('0 4 * * *')
  async synthesisBackstop() {
    await this.prisma.withAdvisoryLock(CronLock.SYNTHESIS_BACKSTOP, async () => {
      const candidates = await this.prisma.ground.findMany({
        where: { status: GroundStatus.ACTIVE, report: { is: null } },
        select: { id: true },
      });

      if (candidates.length === 0) return;

      let triggered = 0;
      for (const g of candidates) {
        const active = await this.prisma.groundParticipant.findMany({
          where: { groundId: g.id, userId: { not: null } },
          select: { id: true },
        });
        if (active.length < 2) continue;

        let allDone = true;
        let triggerCheckIn: { id: string; participantId: string } | null = null;
        for (const p of active) {
          const s2 = await this.prisma.checkIn.findFirst({
            where: { participantId: p.id, sessionNumber: 2, status: CheckInStatus.COMPLETED },
            select: { id: true },
          });
          if (!s2) { allDone = false; break; }
          triggerCheckIn = { id: s2.id, participantId: p.id };
        }

        if (!allDone || !triggerCheckIn) continue;

        this.events.emit(GroundworkEvents.CHECK_IN_COMPLETED, {
          checkInId: triggerCheckIn.id,
          groundId: g.id,
          participantId: triggerCheckIn.participantId,
          sessionNumber: 2,
        } satisfies CheckInCompletedEvent);
        triggered++;
      }

      if (triggered > 0) {
        this.logger.warn(`Synthesis backstop: re-triggered synthesis for ${triggered} stuck ground(s)`);
      }
    });
  }

  /**
   * GW-50 post-resolution feedback — 10 AM daily. ~24h after a ground closes,
   * invite each party (who hasn't already submitted feedback) to answer one
   * question about whether the process felt fair. The 24-72h window sends once
   * per party without a dedicated schema column.
   */
  @Cron('0 10 * * *')
  async sendFeedbackRequests() {
    const now = new Date();
    const closedAfter = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    const closedBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const frontend = this.config.get<string>('resend.frontendUrl') || '';

    const recentlyClosed = await this.prisma.ground.findMany({
      where: {
        status: GroundStatus.CLOSED,
        closedAt: { gte: closedAfter, lte: closedBefore },
      },
      select: { id: true, label: true, participants: { select: { id: true, email: true } } },
    });

    let sent = 0;
    for (const g of recentlyClosed) {
      const existing = await this.prisma.outcomeFeedback.findMany({
        where: { groundId: g.id },
        select: { participantId: true },
      });
      const alreadySubmitted = new Set(existing.map((f) => f.participantId));

      for (const p of g.participants) {
        if (alreadySubmitted.has(p.id)) continue;
        try {
          await this.email.sendFeedbackRequest(p.email, g.label, `${frontend}/grounds/${g.id}/feedback`);
          sent++;
        } catch (err: any) {
          this.logger.error(`Feedback request failed for participant ${p.id}: ${err.message}`);
        }
      }
    }

    if (sent > 0) {
      this.logger.log(`Feedback requests sent: ${sent}`);
    }
  }
}
