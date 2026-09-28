import { Injectable, Logger } from '@nestjs/common';
import { isAGuestIn } from '../participants/a-guest-is-never-somebody-on-the-hosts-list';
import { deadlineOf } from './when-the-clock-starts';
import { A_GROUND_IS_OVER, A_GROUND_IS_HELD, A_GROUND_HAS_STOPPED } from './a-ground-that-has-ended';
import { AN_ANSWER } from './an-answer-includes-a-refusal';
import { recordRoundCompletion } from './round-completion';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService, CronLock } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { GroundworkEvents, CheckInCompletedEvent } from '../../common';
import { GroundStatus, CheckInStatus, TurnRole, PartyType, ReportActivationStatus } from '@prisma/client';
import { PatternsService } from '../patterns/patterns.service';
import { ConversationService } from '../conversation/conversation.service';
import { WARN_BEFORE_IT_LAPSES_DAYS } from '../participants/how-long-an-invite-lasts';

const INACTIVITY_AUTO_CLOSE_MS = 12 * 60 * 60 * 1000;     // 12 hours
const MAX_SESSION_AGE_MS = 48 * 60 * 60 * 1000;            // 48 hours
const WARNING_WINDOW_START_MS = 11 * 60 * 60 * 1000;       // 11h of inactivity
const WARNING_WINDOW_END_MS = 11.5 * 60 * 60 * 1000;       // 11h30m of inactivity

/* One list, in one place: a-ground-that-has-ended.ts. */
const TERMINAL: GroundStatus[] = A_GROUND_IS_OVER;
/**
 * AND A GROUND THAT HAS ALREADY STOPPED IS NOT STOPPED AGAIN.
 *
 * STALLED used to sit in TERMINAL, so every sweep skipped it for free. It is its own state now -
 * because a person has to be able to lift it - and that freedom comes with this obligation: without
 * it the 3am sweep would re-stall the same overdue grounds every night and send every party the
 * same "your check-in has stalled" email once a day forever.
 */
const STOPPED: GroundStatus[] = A_GROUND_HAS_STOPPED;

/**
 * HOW MUCH WARNING BEFORE THE TIME RUNS OUT.
 *
 * Seven days, because the thing being asked for is not a click - it is deciding whether people who
 * have not answered still will, and possibly chasing them. A day's notice on a fortnightly check-in
 * is no notice at all.
 */
const DAYS_OF_NOTICE = 7;
/**
 * A HELD CLOCK DOES NOT RUN. Every sweep in here that moves a ground on, invites into it, or
 * closes and warns about its sessions leaves a paused ground exactly as it found it. The stall
 * sweep was the worst of these: it counted a paused ground as overdue and wrote it STALLED, which
 * is terminal, so a legal hold ended the check-in for good. See a-ground-that-has-ended.ts.
 */
const HELD: GroundStatus[] = A_GROUND_IS_HELD;
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
    /** Last, so the specs that build this positionally keep compiling. The sweep only decides which sessions are stale; finishing one is the conversation module's job. */
    private conversation: ConversationService,
  ) {}

  /**
   * Daily sweep: transition any ground past its timelineDays to STALLED.
   * Billing stops automatically because the monthly cron only queries ACTIVE grounds.
   * timeZone pinned to UTC (previously implicit - see the two weekly pattern
   * crons below for the same fix and its rationale) so "3am" means the same
   * instant everywhere the app runs, not "3am wherever this process's clock
   * thinks it is."
   */
  /**
   * SEND THE INVITES THAT WERE HELD BACK UNTIL SOMEBODY'S FIRST DAY.
   *
   * A ground can be set up about a person before they begin - a hire starting next month, an advisor
   * whose year has not opened, a manager taking over on the first. Agreeing what good looks like before
   * anybody can be judged against it is the point of those grounds, and it is why they are opened early.
   *
   * What must not happen early is the invitation. An email asking somebody to account for their work
   * cannot be recalled once it has been read, and it can arrive before they have signed a contract. So
   * `addParticipant` leaves `invitedAt` null and sends nothing when the start date is ahead, and this
   * sends it on the day.
   *
   * SIX AM, so it lands as the first thing on somebody's first morning rather than overnight.
   */
  @Cron('0 6 * * *', { timeZone: 'UTC' })
  async inviteJoinersWhoStartToday() {
    await this.prisma.withAdvisoryLock(CronLock.DEFERRED_INVITES, async () => {
      const now = new Date();
      const due = await this.prisma.groundParticipant.findMany({
        where: {
          /** The three conditions together. Started, never invited, and still has a live token. */
          startsAt: { not: null, lte: now },
          invitedAt: null,
          inviteToken: { not: null },
          /**
           * NOT TERMINAL, rather than ACTIVE. This was `status: ACTIVE` and found nothing, which
           * driving it exposed immediately: a ground whose people have not started is normally
           * AWAITING_PARTIES, and that is the exact state this sweep exists to serve. Requiring ACTIVE
           * meant the invite was held forever on precisely the grounds it was held for.
           *
           * What must be excluded is a ground that has finished. Inviting somebody into a resolved or
           * stalled ground is worse than never inviting them. A held one waits too: the invite is not
           * lost, it goes the morning after the hold is lifted.
           */
          ground: { status: { notIn: [...TERMINAL, ...HELD] } },
        },
        select: {
          id: true, email: true, inviteToken: true, groundId: true,
          ground: { select: { label: true, scenario: true, brief: true, initiator: { select: { firstName: true } } } },
        },
        take: 200,
      });

      for (const p of due) {
        try {
          await this.email.sendTheInviteThisGroundSends(
            p.ground,
            p.email,
            p.ground.initiator?.firstName ?? 'A founder',
            p.inviteToken!,
            undefined,
            { kind: 'PARTICIPANT_INVITE', participantId: p.id, groundId: p.groundId },
          );
          /**
           * Stamped only after the send succeeds, so a provider outage retries tomorrow rather than
           * leaving somebody permanently uninvited to a ground that is already running.
           */
          await this.prisma.groundParticipant.update({
            where: { id: p.id },
            data: { invitedAt: new Date(), notifiedAt: new Date() },
          });
          this.logger.log(`Deferred invite sent for participant ${p.id}: their start date has arrived.`);
        } catch (err) {
          this.logger.error(`Deferred invite for participant ${p.id} did not send; it will be retried tomorrow. ${(err as Error).message}`);
        }
      }
    });
  }

  /**
   * NOTHING RUNS OUT OF TIME WITHOUT NOTICE. IT USED TO, EVERY TIME.
   *
   * Nate Peterson, 23 September 2026: "i let a few check-ins wait and they are now stalled." That
   * is the ordinary thing that happens to a busy person, and the product's entire answer was to
   * write the check-in off at 3am and email everybody that it was over. There was no warning at
   * any point before it, so the first anybody heard of the deadline was the obituary.
   *
   * One email, to whoever runs it, while there is still time to do something about it. One-shot on
   * `stallWarningSentAt`, so a check-in nobody extends is not nagged about daily for a week - the
   * decision to let it run out is a real answer.
   *
   * RUNS BEFORE THE STALL SWEEP, and that ordering matters: a check-in inside the warning window
   * has not passed its deadline yet, so the two can never fire on the same night for the same
   * ground. If they ever could, the warning would arrive after the thing it warns about.
   */
  @Cron('0 2 * * *', { timeZone: 'UTC' })
  async warnBeforeTimeRunsOut() {
    await this.prisma.withAdvisoryLock(CronLock.STALL_GROUNDS, async () => {
      const candidates = await this.prisma.ground.findMany({
        where: {
          status: { notIn: [...TERMINAL, ...HELD, ...STOPPED] },
          stallWarningSentAt: null,
        },
        select: {
          id: true, label: true, createdAt: true, startsAt: true, timelineDays: true,
          initiator: { select: { email: true } },
        },
      });

      const frontend = this.config.get<string>('resend.frontendUrl') || '';
      let warned = 0;
      for (const g of candidates) {
        const deadline = deadlineOf(g);
        if (!deadline) continue;
        const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / 86_400_000);
        /*
         * ALREADY PAST IT COUNTS TOO, and that is the case that matters most.
         *
         * The first version skipped anything with negative days left, which would have been every
         * check-in already overdue on the day this shipped - so the whole existing population would
         * have stalled tonight, unwarned, which is exactly the thing being fixed. A ground past its
         * date gets the notice tonight and is stalled tomorrow if nobody acts.
         */
        if (daysLeft > DAYS_OF_NOTICE) continue;
        /* Stamped before the send, so a mailer that throws cannot turn one notice into a daily one. */
        await this.prisma.ground.update({ where: { id: g.id }, data: { stallWarningSentAt: new Date() } });
        const to = g.initiator?.email;
        if (!to) continue;
        await this.email
          .sendTimeRunningOut(to, g.label, `${frontend}/grounds/${g.id}`, deadline, Math.max(0, daysLeft))
          .catch((err: any) => this.logger.error(`Time-running-out notice failed for ground ${g.id}: ${err.message}`));
        warned += 1;
      }
      if (warned) this.logger.log(`Warned ${warned} lead(s) that a check-in is about to run out of time.`);
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { timeZone: 'UTC' })
  async stallOverdueGrounds() {
    await this.prisma.withAdvisoryLock(CronLock.STALL_GROUNDS, async () => {
      /*
       * NOTHING STALLS THAT WAS NEVER WARNED.
       *
       * "have a risk of stalling show, don't just stall." The notice sweep runs an hour before this
       * one, so a check-in nobody has told about gets its warning tonight and is stalled tomorrow
       * at the earliest - never in the same silence it used to happen in. `stallWarningSentAt` is
       * the record that somebody was actually told, so this reads it rather than assuming.
       *
       * The cost is one extra day on the clock for a check-in whose lead ignores the notice. That is
       * the right way round: the product has never once lost anything by waiting a day, and it has
       * lost whole check-ins by not waiting.
       */
      const candidates = await this.prisma.ground.findMany({
        where: {
          status: { notIn: [...TERMINAL, ...HELD, ...STOPPED] },
          stallWarningSentAt: { not: null },
        },
        select: { id: true, createdAt: true, startsAt: true, timelineDays: true, status: true },
      });

      const staleIds = candidates
        .filter((g) => {
          /* The deadline runs from the start date when one was set, not from when the check-in was
             made. This measured lateness against a date nobody had agreed to. */
          const deadline = deadlineOf(g);
          return deadline !== null && deadline < new Date();
        })
        .map((g) => g.id);

      if (staleIds.length === 0) return;

      /*
       * AND WHAT IT WAS BEFORE IS WRITTEN DOWN, so reopening can put it back rather than guess.
       *
       * The same shape as `pausedFromStatus`: a state something else can put you in has to remember
       * where it came from, or the way out has to invent a destination. One update per prior status
       * rather than one per ground - there are four of them at most.
       */
      const byPrior = new Map<GroundStatus, string[]>();
      for (const g of candidates.filter((c) => staleIds.includes(c.id))) {
        byPrior.set(g.status, [...(byPrior.get(g.status) ?? []), g.id]);
      }
      for (const [prior, ids] of byPrior) {
        await this.prisma.ground.updateMany({
          where: { id: { in: ids } },
          data: { status: GroundStatus.STALLED, stalledFromStatus: prior, stalledAt: new Date() },
        });
      }

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
   * Gap #22 - Weekly period boundary sweep (Monday 5 AM UTC).
   * Calls startNewPeriod() for every active ground so that:
   *   - CANDIDATE detections are archived with their period tag.
   *   - Consecutive-period counters are reset for detections that missed this period.
   *   - Any detection that reached THREE consecutive periods is promoted to SURFACED.
   *
   * timeZone was previously unset, meaning this ran in whatever local
   * timezone the Node process happened to be in - implicit and liable to
   * differ between a developer's machine and the deployed environment (no
   * TZ env var is set anywhere in this repo's config). Pinned explicitly to
   * UTC so behavioral-pattern surfacing timing is identical everywhere.
   */
  @Cron('0 5 * * 1', { timeZone: 'UTC' }) // Every Monday at 05:00 UTC
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
   * Gap #29 - Weekly concentration risk sweep (Monday 5:30 AM UTC).
   * Runs detectConcentrationRisk() for every organisation that has at least one
   * active ground, surfacing a CONCENTRATION_RISK detection when a single person
   * is an active party in 3 or more grounds simultaneously.
   *
   * timeZone pinned to UTC for the same reason as weeklyPeriodBoundary above -
   * it was previously implicit (server-local time, unset anywhere in config).
   */
  @Cron('30 5 * * 1', { timeZone: 'UTC' }) // Every Monday at 05:30 UTC
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
  // A fixed-minute-interval schedule fires at the same wall-clock cadence
  // regardless of timezone, so timeZone has no effect on when this actually
  // runs - pinned anyway for consistency with the fixed-hour crons in this
  // file, so nothing here is left ambiguous for a future reader.
  @Cron('*/30 * * * *', { timeZone: 'UTC' })
  async autoCloseStaleCheckIns() {
    await this.prisma.withAdvisoryLock(CronLock.AUTO_CLOSE_CHECK_INS, async () => {
      const inProgress = await this.prisma.checkIn.findMany({
        /* A session on a held ground is not stale, it is waiting. Its clock resumes when the ground does. */
        where: { status: CheckInStatus.IN_PROGRESS, ground: { status: { notIn: HELD } } },
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

        /*
         * THE CLOCK FINISHES A SESSION THE WAY A PERSON DOES. This used to write COMPLETED itself,
         * emit, and close the round - and skip everything else a completion does, so the person who
         * walked away had an empty record and no next session. One place finishes a session now;
         * this decides only that it is time. See ConversationService.closeByTheClock.
         */
        await this.conversation.closeByTheClock(checkIn.id);

        this.logger.warn(`Auto-closed check-in ${checkIn.id} (session ${checkIn.sessionNumber}): ${reason}`);
        closed++;
      }

      if (closed > 0) {
        this.logger.log(`Auto-close sweep: closed ${closed} stale check-in(s)`);
      }
    });
  }

  /**
   * NOBODY'S WORDS ARE LEFT HANGING WITHOUT ANYBODY KNOWING.
   *
   * Both message routes write the person's turn, call the model, then write the reply. If the model
   * fails the person's turn is deleted so the record does not hold a question with no answer. If
   * the PROCESS dies between the two writes - a deploy, a crash, a timeout at the edge - nothing
   * runs the delete, and the person's turn sits there for ever with no reply after it. The two
   * writes cannot share a transaction: the model call is between them and can take ten seconds.
   *
   * So this counts them. Once an hour: every open session whose LAST turn is the person's and is
   * more than an hour old. Ids only, never the words. Silent orphans were the problem; a counter
   * that somebody can see is most of the fix.
   */
  @Cron('30 * * * *', { timeZone: 'UTC' })
  async countOrphanedTurns() {
    const anHourAgo = new Date(Date.now() - 3600_000);
    const open = await this.prisma.checkIn.findMany({
      where: { status: CheckInStatus.IN_PROGRESS, turns: { some: { role: TurnRole.PERSON, createdAt: { lt: anHourAgo } } } },
      select: { id: true },
    });
    const orphaned: string[] = [];
    for (const c of open) {
      const last = await this.prisma.conversationTurn.findFirst({
        where: { checkInId: c.id },
        orderBy: { createdAt: 'desc' },
        select: { role: true, createdAt: true },
      });
      if (last?.role === TurnRole.PERSON && last.createdAt < anHourAgo) orphaned.push(c.id);
    }
    if (orphaned.length > 0) {
      this.logger.warn(`${orphaned.length} check-in(s) hold a person's turn with no reply after an hour: ${orphaned.join(', ')}`);
    }
  }

  /**
   * Fires session-closing warnings every 15 minutes. When a session has been
   * inactive for 11–11h30m, an AI turn is injected informing the person the
   * session auto-closes in 30 minutes. warningFiredAt is set so the warning
   * fires at most once per session.
   */
  @Cron('*/15 * * * *', { timeZone: 'UTC' })
  async fireSessionClosingWarnings() {
    await this.prisma.withAdvisoryLock(CronLock.SESSION_CLOSING_WARNINGS, async () => {
      const candidates = await this.prisma.checkIn.findMany({
        /* Same as the auto-close above: nobody is warned that a held session is closing, because it is not. */
        where: { status: CheckInStatus.IN_PROGRESS, warningFiredAt: null, ground: { status: { notIn: HELD } } },
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
              'This session closes in 30 minutes if nothing else is said. Add anything you still want on the record now.',
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
   * AN INVITATION THAT IS ABOUT TO LAPSE, AND ONE THAT HAS (NL-009). Nothing warned before a link
   * lapsed, so a person who lost the mail quietly never arrived and the lead never knew. Two days out
   * the invitee is told, with the link that still works; once it has lapsed the lead is told, once.
   */
  @Cron('0 7 * * *', { timeZone: 'UTC' })
  async tellThemBeforeAnInviteLapses() {
    await this.prisma.withAdvisoryLock(CronLock.INVITE_EXPIRY, async () => {
      const now = new Date();
      const soon = new Date(now.getTime() + WARN_BEFORE_IT_LAPSES_DAYS * 24 * 60 * 60 * 1000);
      const frontend = this.config.get<string>('resend.frontendUrl') || '';
      const aboutToLapse = await this.prisma.groundParticipant.findMany({
        where: { userId: null, inviteToken: { not: null }, inviteExpiryWarnedAt: null, invitedAt: { not: null }, inviteTokenExpiresAt: { gt: now, lte: soon }, ground: { status: { notIn: TERMINAL } } },
        select: { id: true, email: true, inviteToken: true, ground: { select: { label: true } } },
        take: 200,
      });
      for (const p of aboutToLapse) {
        try {
          await this.email.sendInviteAboutToLapse(p.email, p.ground.label, this.email.buildInviteUrl(p.inviteToken!), p.id);
          await this.prisma.groundParticipant.update({ where: { id: p.id }, data: { inviteExpiryWarnedAt: now } });
        } catch (err: any) {
          this.logger.warn(`Could not warn ${p.email} about a lapsing invite: ${err?.message}`);
        }
      }
      const lapsed = await this.prisma.groundParticipant.findMany({
        where: { userId: null, inviteToken: { not: null }, inviteLapsedToldAt: null, invitedAt: { not: null }, inviteTokenExpiresAt: { lte: now }, ground: { status: { notIn: TERMINAL } } },
        select: { id: true, email: true, ground: { select: { id: true, label: true, initiator: { select: { email: true, firstName: true } } } } },
        take: 200,
      });
      for (const p of lapsed) {
        try {
          if (p.ground.initiator?.email) {
            await this.email.sendInviteLapsed(p.ground.initiator.email, p.ground.initiator.firstName, p.email, p.ground.label, `${frontend}/grounds/${p.ground.id}`);
          }
          await this.prisma.groundParticipant.update({ where: { id: p.id }, data: { inviteLapsedToldAt: now } });
        } catch (err: any) {
          this.logger.warn(`Could not tell the lead about a lapsed invite for ${p.email}: ${err?.message}`);
        }
      }
      if (aboutToLapse.length || lapsed.length) this.logger.log(`Invite expiry: warned ${aboutToLapse.length}, told the lead about ${lapsed.length}.`);
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
  @Cron(CronExpression.EVERY_DAY_AT_9AM, { timeZone: 'UTC' })
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
  @Cron('*/15 * * * *', { timeZone: 'UTC' })
  async sendSessionReadyNotifications() {
    /* Its own lock (NL-037): it shared SEND_REMINDERS with the daily job, and a long pass here
       overlapping 09:00 skipped the day's reminders with no retry. */
    await this.prisma.withAdvisoryLock(CronLock.SESSION_READY, async () => this.sendSessionReadyNotificationsInner());
  }

  private async sendSessionReadyNotificationsInner() {
    const now = new Date();
    await this.announceOpenedSessions(now);
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
            /* No recordEntries here, structurally (NL-007): this sweep used to put the person's last
               private record line into the mail and the WhatsApp body as "Last time: ...". The product's
               central promise is that nothing they wrote reaches a mailbox; the reminder never needed it. */
            user: { select: { phoneNumber: true } },
          },
        },
      },
      take: 200,
    });

    for (const ci of newlyOpen) {
      const p = ci.participant;
      const checkInUrl = this.email.buildCheckInUrl(ci.id);
      try {
        /**
         * WHATSAPP IS IN ADDITION TO EMAIL, NOT INSTEAD OF IT. Her decision.
         *
         * This was `if (whatsapp) ... else email`, so the moment somebody added a phone number they
         * STOPPED getting check-in emails. Nobody chose that: adding a number is opting IN to a second
         * reminder, not opting out of the first, and the person who typed it in had no way to know it
         * had silenced their inbox. It also put every reminder for that person behind one channel that
         * is not even live yet - WhatsApp is key-gated and off - so on a production account with a
         * number saved and the toggle later switched on, reminders would have quietly narrowed to a
         * single dependency.
         *
         * EMAIL GOES FIRST AND IS AWAITED. It is the channel that works, and the one the
         * `sessionReadyNotifiedAt` stamp is really promising. WhatsApp follows in its own try, so a
         * failure there cannot lose the email, cannot leave the stamp unwritten, and cannot cause the
         * next cron pass to email the same person twice.
         */
        await this.email.sendSessionReady(p.email, p.ground.label, checkInUrl);

        if (p.user?.phoneNumber && (await this.whatsapp.isEnabled())) {
          try {
            await this.whatsapp.sendMessage(p.user.phoneNumber, `Your next check-in for ${p.ground.label} is open.\n${checkInUrl}`, { checkInId: ci.id, kind: 'session-ready' });
          } catch (waErr: any) {
            // The email is already out. A second channel failing is worth knowing about, not retrying.
            this.logger.warn(`WhatsApp session-ready failed for check-in ${ci.id}, email was sent: ${waErr.message}`);
          }
        }

        await this.prisma.checkIn.update({ where: { id: ci.id }, data: { sessionReadyNotifiedAt: now } });
      } catch (err: any) {
        this.logger.error(`Session-ready notification failed for check-in ${ci.id}: ${err.message}`);
      }
    }
  }

  /**
   * checkin.opened, ONCE PER SESSION, FIRST SESSION INCLUDED.
   *
   * The email above only covers session 2 onward, because the first is announced by the invitation.
   * A host system subscribed to webhooks has no invitation email to read, so this announces every
   * session the moment it is open to an accepted person: the round is what they need to tell that
   * person about in their own channel. Stamped so it fires once whatever else fails around it.
   */
  private async announceOpenedSessions(now: Date) {
    const opened = await this.prisma.checkIn.findMany({
      where: {
        status: CheckInStatus.NOT_STARTED,
        openedAnnouncedAt: null,
        OR: [{ availableFrom: null }, { availableFrom: { lte: now } }],
        participant: { userId: { not: null }, ground: { status: { notIn: TERMINAL } } },
      },
      select: {
        id: true,
        groundId: true,
        participantId: true,
        sessionNumber: true,
        participant: { select: { email: true, userId: true, ground: { select: { organizationId: true } } } },
      },
      take: 200,
    });
    for (const ci of opened) {
      try {
        /* A guest's check-in is announced as nobody's on the host's list. See a-guest-is-never-somebody-on-the-hosts-list. */
        const person = ci.participant.email && !(await isAGuestIn(this.prisma, ci.participant.ground.organizationId, ci.participant))
          ? await this.prisma.person.findFirst({
              where: { organizationId: ci.participant.ground.organizationId, email: ci.participant.email, active: true },
              select: { externalId: true },
            })
          : null;
        this.events.emit(GroundworkEvents.CHECK_IN_OPENED, {
          checkInId: ci.id,
          groundId: ci.groundId,
          participantId: ci.participantId,
          sessionNumber: ci.sessionNumber,
          personExternalId: person?.externalId ?? null,
        });
        await this.prisma.checkIn.update({ where: { id: ci.id }, data: { openedAnnouncedAt: now } });
      } catch (err: any) {
        this.logger.error(`Could not announce check-in ${ci.id} as opened: ${err.message}`);
      }
    }
  }

  private async sendRemindersInner() {
    const now = new Date();
    const throttleBefore = new Date(now.getTime() - NUDGE_THROTTLE_DAYS * 24 * 60 * 60 * 1000);
    const frontend = this.config.get<string>('resend.frontendUrl') || '';

    /*
     * THE RETURN-NUDGE HALF OF THIS JOB IS GONE (NL-021). Two engines sent the same nudge: this one
     * at 09:00 with a three-day throttle, and remind.service at 08:00 with the policy that reads the
     * lead's chase settings. They coordinated only by the 08:00 job having stamped lastNudgedAt an
     * hour earlier. remind.service keeps the policy; this job keeps the activation reminders below.
     */
    const returnNudges = 0;

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
        /*
         * U.10 REVIEW: "Your report for 'Sales team, Q3' is ready to view" told Faraji this before
         * he had checked in at all. This query only asked whether the GROUND's report had been
         * released, never whether THIS participant had answered anything - so anybody added to a
         * ground where somebody else's report went out got the same email, about a report that, for
         * them, does not yet exist to view. A reveal reminder is about a party's own report being
         * ready; a party who has never checked in has no report of their own to be ready.
         */
        checkIns: { some: { status: CheckInStatus.COMPLETED } },
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
        await this.email.sendActivationRevealReminder(p.email, p.ground.label, `${frontend}/grounds/${p.ground.id}/report`);
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
   * THE BACKSTOP REACHES EVERY ROUND, NOT ONLY THE FIRST.
   *
   * GW-06: if the CHECK_IN_COMPLETED event was lost - a crash between a session completing and the
   * synthesis - a ground can sit with everybody done and no report. This sweep found that state and
   * re-emitted the event. But it looked for it in exactly one place: `sessionNumber: 1`, on a ground
   * that was ACTIVE, with `report: { is: null }`. So a failed release on session 5 of a ground that
   * already had a session-1 report was permanent; and a ground whose FIRST release never fired sits
   * at AWAITING_PARTIES - it only becomes ACTIVE when a report releases - and could never be reached.
   *
   * Now: every live ground, every session anybody has answered. A round is closed when everybody
   * who is not managing-only has answered it (a decline is an answer) and at least one account is
   * COMPLETED. A closed round with no completion row, or no report round taken for it, is the
   * repair: the row is written if missing, and the event is re-emitted as a REPAIR - so the listener
   * synthesises and releases, and does not mail the admin "X has checked in" again.
   */
  @Cron('0 4 * * *', { timeZone: 'UTC' })
  async synthesisBackstop() {
    await this.prisma.withAdvisoryLock(CronLock.SYNTHESIS_BACKSTOP, async () => {
      const grounds = await this.prisma.ground.findMany({
        where: { status: { notIn: [...TERMINAL, ...HELD] } },
        select: { id: true },
      });

      let triggered = 0;
      for (const g of grounds) {
        const parties = await this.prisma.groundParticipant.findMany({
          where: { groundId: g.id, managingOnly: false },
          select: { id: true },
        });
        if (parties.length < 2) continue;
        const ids = parties.map((p) => p.id);

        const answers = await this.prisma.checkIn.findMany({
          where: { groundId: g.id, participantId: { in: ids }, status: { in: AN_ANSWER } },
          select: { id: true, participantId: true, sessionNumber: true, status: true },
          orderBy: { sessionNumber: 'asc' },
        });
        const rounds = new Map<number, typeof answers>();
        for (const a of answers) rounds.set(a.sessionNumber, [...(rounds.get(a.sessionNumber) ?? []), a]);

        /* Every closed round gets its completion row if it is missing - cheap, idempotent, no model
           call. Only the LATEST closed round is re-emitted for synthesis: re-running an older round's
           picture cannot help anybody, and a round whose picture was empty keeps no snapshot at all,
           so bounding the re-emit to one round per ground is what keeps this from firing daily. */
        const closed: { sessionNumber: number; anAccount: (typeof answers)[number] }[] = [];
        for (const [sessionNumber, rows] of rounds) {
          if (new Set(rows.map((r) => r.participantId)).size < parties.length) continue;
          const anAccount = rows.find((r) => r.status === CheckInStatus.COMPLETED);
          if (!anAccount) continue;
          closed.push({ sessionNumber, anAccount });
        }
        for (const { sessionNumber } of closed) {
          const recorded = await this.prisma.roundCompletion.findUnique({ where: { groundId_sessionNumber: { groundId: g.id, sessionNumber } }, select: { id: true } });
          if (!recorded) await recordRoundCompletion(this.prisma, this.events, g.id, sessionNumber);
        }
        const latest = closed[closed.length - 1];
        if (!latest) continue;
        const taken = await this.prisma.reportRound.findUnique({ where: { groundId_sessionNumber: { groundId: g.id, sessionNumber: latest.sessionNumber } }, select: { id: true } });
        if (taken) continue;

        this.events.emit(GroundworkEvents.CHECK_IN_COMPLETED, {
          checkInId: latest.anAccount.id,
          groundId: g.id,
          participantId: latest.anAccount.participantId,
          sessionNumber: latest.sessionNumber,
          source: 'repair',
        } satisfies CheckInCompletedEvent);
        triggered++;
      }

      if (triggered > 0) {
        this.logger.warn(`Synthesis backstop: re-triggered ${triggered} round(s) that closed and were never recorded or released`);
      }
    });
  }

  /**
   * GW-50 post-resolution feedback - 10 AM daily. ~24h after a ground closes,
   * invite each party (who hasn't already submitted feedback) to answer one
   * question about whether the process felt fair. The 24-72h window sends once
   * per party without a dedicated schema column.
   */
  @Cron('0 10 * * *', { timeZone: 'UTC' })
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
          /* The report page is where outcome feedback is actually given — there has never
             been a `/grounds/:id/feedback` route, so this invitation has always led to the
             not-found page. */
          await this.email.sendFeedbackRequest(p.email, g.label, `${frontend}/grounds/${g.id}/report`);
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
