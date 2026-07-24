import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService, CronLock } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { GroundworkEvents, CheckInCompletedEvent } from '../../common';
import { GroundStatus, CheckInStatus, TurnRole, PartyType, ReportActivationStatus } from '@prisma/client';
import { PatternsService } from '../patterns/patterns.service';

const INACTIVITY_AUTO_CLOSE_MS = 12 * 60 * 60 * 1000;     // 12 hours
const MAX_SESSION_AGE_MS = 48 * 60 * 60 * 1000;            // 48 hours
const WARNING_WINDOW_START_MS = 11 * 60 * 60 * 1000;       // 11h of inactivity
const WARNING_WINDOW_END_MS = 11.5 * 60 * 60 * 1000;       // 11h30m of inactivity

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
    private patterns: PatternsService,
    private whatsapp: WhatsAppService,
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
   * Gap #22 - Weekly period boundary sweep (Monday 5 AM).
   * Calls startNewPeriod() for every active ground so that:
   *   - CANDIDATE detections are archived with their period tag.
   *   - Consecutive-period counters are reset for detections that missed this period.
   *   - Any detection that reached THREE consecutive periods is promoted to SURFACED.
   */
  @Cron('0 5 * * 1') // Every Monday at 05:00
  async weeklyPeriodBoundary() {
    const activeGrounds = await this.prisma.ground.findMany({
      where: { status: { in: [GroundStatus.ACTIVE, GroundStatus.AWAITING_PARTIES, GroundStatus.REPORT_READY] } },
      select: { id: true },
    });

    if (activeGrounds.length === 0) return;

    this.logger.log(`Weekly period boundary: processing ${activeGrounds.length} active ground(s).`);
    let processed = 0;
    for (const g of activeGrounds) {
      try {
        await this.patterns.startNewPeriod(g.id);
        // Cross-party collusion pass: this is the only place with all parties'
        // records together on a per-ground cadence, and it owns the period
        // boundary the three-period rule runs on. Isolated so a failure here
        // never blocks the period boundary.
        try {
          await this.patterns.analyzeGroundForCollusion(g.id);
        } catch (cerr: any) {
          this.logger.error(`analyzeGroundForCollusion failed for ground ${g.id}: ${cerr.message}`);
        }
        processed++;
      } catch (err: any) {
        this.logger.error(`startNewPeriod failed for ground ${g.id}: ${err.message}`);
      }
    }
    this.logger.log(`Weekly period boundary complete: ${processed}/${activeGrounds.length} ground(s) processed.`);
  }

  /**
   * Gap #29 - Weekly concentration risk sweep (Monday 5:30 AM).
   * Runs detectConcentrationRisk() for every organisation that has at least one
   * active ground, surfacing a CONCENTRATION_RISK detection when a single person
   * is an active party in 3 or more grounds simultaneously.
   */
  @Cron('30 5 * * 1') // Every Monday at 05:30
  async weeklyConcentrationRisk() {
    // Collect distinct org IDs from active grounds.
    const activeGrounds = await this.prisma.ground.findMany({
      where: { status: { in: [GroundStatus.ACTIVE, GroundStatus.AWAITING_PARTIES, GroundStatus.REPORT_READY] } },
      select: { organizationId: true },
      distinct: ['organizationId'],
    });

    if (activeGrounds.length === 0) return;

    this.logger.log(`Concentration risk sweep: checking ${activeGrounds.length} organisation(s).`);
    for (const g of activeGrounds) {
      try {
        await this.patterns.detectConcentrationRisk(g.organizationId);
      } catch (err: any) {
        this.logger.error(`detectConcentrationRisk failed for org ${g.organizationId}: ${err.message}`);
      }
    }
  }

  /**
   * Auto-closes stale IN_PROGRESS check-ins every 30 minutes.
   * Two triggers:
   *   1. 12+ hours of inactivity (no conversation turn in the window)
   *   2. Session is 48+ hours old (absolute age guard)
   * Fires CHECK_IN_COMPLETED so the existing reports listener handles any
   * synthesis logic - auto-close is source-transparent to downstream consumers.
   */
  @Cron('*/30 * * * *')
  async autoCloseStaleCheckIns() {
    await this.prisma.withAdvisoryLock(CronLock.AUTO_CLOSE_CHECK_INS, async () => {
      const inProgress = await this.prisma.checkIn.findMany({
        where: { status: CheckInStatus.IN_PROGRESS },
        select: {
          id: true,
          groundId: true,
          participantId: true,
          sessionNumber: true,
          startedAt: true,
          createdAt: true,
        },
      });

      if (inProgress.length === 0) return;

      const now = new Date();
      let closed = 0;

      for (const checkIn of inProgress) {
        const latestTurn = await this.prisma.conversationTurn.findFirst({
          where: { checkInId: checkIn.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });

        const sessionStart = checkIn.startedAt ?? checkIn.createdAt;
        const sessionAgeMs = now.getTime() - sessionStart.getTime();
        const lastActivityMs = latestTurn
          ? now.getTime() - latestTurn.createdAt.getTime()
          : sessionAgeMs;

        const inactiveStale = lastActivityMs >= INACTIVITY_AUTO_CLOSE_MS;
        const absoluteStale = sessionAgeMs >= MAX_SESSION_AGE_MS;

        if (!inactiveStale && !absoluteStale) continue;

        const reason = absoluteStale
          ? `session age ${Math.round(sessionAgeMs / 3_600_000)}h >= 48h`
          : `inactivity ${Math.round(lastActivityMs / 3_600_000)}h >= 12h`;

        await this.prisma.checkIn.update({
          where: { id: checkIn.id },
          data: { status: CheckInStatus.COMPLETED, completedAt: now },
        });

        this.events.emit(GroundworkEvents.CHECK_IN_COMPLETED, {
          checkInId: checkIn.id,
          participantId: checkIn.participantId,
          groundId: checkIn.groundId,
          sessionNumber: checkIn.sessionNumber,
          source: 'auto-close',
        } as CheckInCompletedEvent & { source: string });

        this.logger.warn(`Auto-closed check-in ${checkIn.id} (session ${checkIn.sessionNumber}): ${reason}`);
        closed++;
      }

      if (closed > 0) {
        this.logger.log(`Auto-close sweep: closed ${closed} stale check-in(s)`);
      }
    });
  }

  /**
   * Fires session-closing warnings every 15 minutes. When a session has been
   * inactive for 11–11h30m, an AI turn is injected informing the person the
   * session auto-closes in 30 minutes. warningFiredAt is set so the warning
   * fires at most once per session.
   */
  @Cron('*/15 * * * *')
  async fireSessionClosingWarnings() {
    await this.prisma.withAdvisoryLock(CronLock.SESSION_CLOSING_WARNINGS, async () => {
      const candidates = await this.prisma.checkIn.findMany({
        where: { status: CheckInStatus.IN_PROGRESS, warningFiredAt: null },
        select: { id: true, groundId: true, participantId: true, sessionNumber: true },
      });

      if (candidates.length === 0) return;

      const now = new Date();
      let warned = 0;

      for (const checkIn of candidates) {
        const latestTurn = await this.prisma.conversationTurn.findFirst({
          where: { checkInId: checkIn.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });

        if (!latestTurn) continue;

        const inactiveMs = now.getTime() - latestTurn.createdAt.getTime();

        // Window: inactive between 11h and 11h30m
        if (inactiveMs < WARNING_WINDOW_START_MS || inactiveMs >= WARNING_WINDOW_END_MS) continue;

        await this.prisma.conversationTurn.create({
          data: {
            checkInId: checkIn.id,
            role: TurnRole.AI,
            content:
              'This session closes automatically in 30 minutes due to inactivity. If there is anything you want to add to your record before it closes, add it now.',
          },
        });

        await this.prisma.checkIn.update({
          where: { id: checkIn.id },
          data: { warningFiredAt: now },
        });

        this.logger.log(`Session-closing warning injected for check-in ${checkIn.id} (inactive ~${Math.round(inactiveMs / 3_600_000)}h)`);
        warned++;
      }

      if (warned > 0) {
        this.logger.log(`Session-closing warnings fired: ${warned}`);
      }
    });
  }

  /**
   * Daily reminders (B1) - grounds die silently without them. Two kinds, both
   * throttled to once per NUDGE_THROTTLE_DAYS per party via lastNudgedAt:
   *   1. Return-nudge: an accepted party with an open, now-due session that
   *      hasn't been completed - bring them back.
   *   2. Activation reminder: a REPORT_READY ground the admin hasn't activated -
   *      remind the initiator the report is waiting.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendReminders() {
    await this.prisma.withAdvisoryLock(CronLock.SEND_REMINDERS, async () => this.sendRemindersInner());
  }

  /**
   * "Your next check-in is open" - fires once, the moment a session becomes
   * available, unlike sendReminders above (which only nudges people already
   * sitting on an open check-in for days). Covers both the cadence-scheduled
   * case and the SEQUENTIAL "lead checks in, team's round opens now" case -
   * both just set availableFrom, so a single frequent sweep catches either.
   * Session 1 is excluded: that person already got the invite email.
   */
  @Cron('*/15 * * * *')
  async sendSessionReadyNotifications() {
    await this.prisma.withAdvisoryLock(CronLock.SEND_REMINDERS, async () => this.sendSessionReadyNotificationsInner());
  }

  private async sendSessionReadyNotificationsInner() {
    const now = new Date();
    const frontend = this.config.get<string>('resend.frontendUrl') || '';

    const newlyOpen = await this.prisma.checkIn.findMany({
      where: {
        sessionNumber: { gt: 1 },
        status: CheckInStatus.NOT_STARTED,
        sessionReadyNotifiedAt: null,
        availableFrom: { lte: now },
        participant: { userId: { not: null }, ground: { status: { notIn: TERMINAL } } },
      },
      select: {
        id: true,
        participant: {
          select: {
            id: true,
            email: true,
            ground: { select: { label: true } },
            recordEntries: { orderBy: { createdAt: 'desc' }, take: 1, select: { text: true } },
            user: { select: { phoneNumber: true } },
          },
        },
      },
      take: 200,
    });

    for (const ci of newlyOpen) {
      const p = ci.participant;
      const lastContext = p.recordEntries[0]?.text;
      const checkInUrl = `${frontend}/checkin/${ci.id}`;
      try {
        // WhatsApp when available (single Groundwork number, matched by phone) - email otherwise.
        if (p.user?.phoneNumber && (await this.whatsapp.isEnabled())) {
          const contextLine = lastContext ? `\n\nLast time: "${lastContext}"` : '';
          await this.whatsapp.sendMessage(p.user.phoneNumber, `Your next check-in for ${p.ground.label} is open.${contextLine}\n${checkInUrl}`);
        } else {
          await this.email.sendSessionReady(p.email, p.ground.label, checkInUrl, lastContext);
        }
        await this.prisma.checkIn.update({ where: { id: ci.id }, data: { sessionReadyNotifiedAt: now } });
      } catch (err: any) {
        this.logger.error(`Session-ready notification failed for check-in ${ci.id}: ${err.message}`);
      }
    }
  }

  private async sendRemindersInner() {
    const now = new Date();
    const throttleBefore = new Date(now.getTime() - NUDGE_THROTTLE_DAYS * 24 * 60 * 60 * 1000);
    const frontend = this.config.get<string>('resend.frontendUrl') || '';

    // 1. Return-nudges to idle accepted parties with a due, open session.
    const idleParties = await this.prisma.groundParticipant.findMany({
      where: {
        userId: { not: null },
        ground: { status: { notIn: TERMINAL }, sessionsBalance: { gt: 0 } },
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

    // 3. Reveal reminders: a party whose report has been released but who has
    // not activated their own ReportActivation yet. Distinct from the
    // (legacy, no-longer-fires) activation reminder above, which is about
    // Ground.billingActivatedAt - this is about ReportActivation, the
    // per-party "I'm ready to see it" confirmation each non-initiator must
    // make individually (ReportsService.get() - one party's activation has
    // no effect on any other party, so a party can sit on PENDING forever
    // with their report ready and nobody nudging them). The initiator is
    // exempt from this gate entirely (see get()) and never gets a row, so
    // this is scoped to PARTICIPANT rows only. Same throttle
    // (NUDGE_THROTTLE_DAYS via lastNudgedAt) and same opt-out
    // (user.emailNotifications) as every other reminder in this sweep.
    const pendingReveal = await this.prisma.groundParticipant.findMany({
      where: {
        userId: { not: null },
        partyType: PartyType.PARTICIPANT,
        ground: { status: { notIn: TERMINAL }, report: { releasedAt: { not: null } } },
        OR: [{ lastNudgedAt: null }, { lastNudgedAt: { lt: throttleBefore } }],
        reportActivations: { none: { status: ReportActivationStatus.ACTIVATED } },
      },
      select: {
        id: true,
        email: true,
        ground: { select: { id: true, label: true } },
        user: { select: { emailNotifications: true } },
      },
    });

    let revealReminders = 0;
    for (const p of pendingReveal) {
      if (p.user?.emailNotifications === false) continue;
      try {
        await this.email.sendActivationRevealReminder(p.email, p.ground.label, `${frontend}/report/${p.ground.id}`);
        await this.prisma.groundParticipant.update({ where: { id: p.id }, data: { lastNudgedAt: now } });
        revealReminders++;
      } catch (err: any) {
        this.logger.error(`Reveal reminder failed for participant ${p.id}: ${err.message}`);
      }
    }

    if (returnNudges || activationNudges || revealReminders) {
      this.logger.log(`Reminders sent - ${returnNudges} return-nudge(s), ${activationNudges} activation reminder(s), ${revealReminders} reveal reminder(s).`);
    }
  }

  /**
   * GW-06 synthesis backstop - 4 AM daily. If the CHECK_IN_COMPLETED event
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
          // #36: report triggers after session 1 (both parties' first check-in),
          // not session 2. Backstop mirrors isReportReady().
          const s1 = await this.prisma.checkIn.findFirst({
            where: { participantId: p.id, sessionNumber: 1, status: CheckInStatus.COMPLETED },
            select: { id: true },
          });
          if (!s1) { allDone = false; break; }
          triggerCheckIn = { id: s1.id, participantId: p.id };
        }

        if (!allDone || !triggerCheckIn) continue;

        this.events.emit(GroundworkEvents.CHECK_IN_COMPLETED, {
          checkInId: triggerCheckIn.id,
          groundId: g.id,
          participantId: triggerCheckIn.participantId,
          sessionNumber: 1,
        } satisfies CheckInCompletedEvent);
        triggered++;
      }

      if (triggered > 0) {
        this.logger.warn(`Synthesis backstop: re-triggered synthesis for ${triggered} stuck ground(s)`);
      }
    });
  }

  /**
   * GW-50 post-resolution feedback - 10 AM daily. ~24h after a ground closes,
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
