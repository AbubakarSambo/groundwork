import { Injectable, Logger, OnApplicationBootstrap, Optional } from '@nestjs/common';
import { owesThisSession } from './the-lead-checks-in-when-they-choose';
import { THE_MOST_REPORT_READY_REMINDERS, howManyReportReadyRemindersWereSent } from '../email/the-report-is-ready-reminder';
import { NOT_HELD_FOR_A_SEAT } from '../participants/held-for-a-seat';
import { LeaveBoardService } from '../suites/the-leave-board.service';
import { TimeSheetsService } from '../suites/the-time-sheets.service';
import { SpendingService } from '../suites/the-spending.service';
import { organisationsThatTurnedWhatsAppOn } from '../whatsapp/only-where-whatsapp-is-turned-on';
import { sendTheLeadsDailyNudges } from '../engagement/the-leads-daily-nudge';
import { sendTheMissedCheckInsToThePeople } from '../engagement/missed-check-ins-told-first';
import { sendTheAnchorWeeklyInsights } from '../whatsapp/the-anchor-weekly-insight';
import { sendTheLeadsWeeklyLetters } from '../email/the-leads-weekly-letter';
import { theAnchorScenarioIsOn, theHalfwayMessagesAreOn } from '../admin/what-is-hidden-at-release';
import { onceAcrossCopies, theDay, theWeek } from '../prisma/once-across-copies';
import { theReleaseMoment, reachedTheWarningPointBefore } from './the-release-moment';
import { theSessionsNobodyOpened } from './a-session-nobody-opened';
import { isAGuestIn } from '../participants/a-guest-is-never-somebody-on-the-hosts-list';
import { deadlineOf } from './when-the-clock-starts';
import { A_GROUND_THE_JOBS_LEAVE_ALONE, A_GROUND_IS_HELD, A_GROUND_HAS_STOPPED, A_GROUND_NO_MESSAGE_IS_ABOUT } from './a-ground-that-has-ended';
import { AN_ANSWER } from './an-answer-includes-a-refusal';
import { recordRoundCompletion } from './round-completion';
import { awayUntilOn, leaveOfThePeopleOn, whoOnACheckInIsAway } from '../suites/who-is-away';
import { Cron, CronExpression } from '@nestjs/schedule';
import { everyRowAPageAtATime } from '../whatsapp/every-row-a-page-at-a-time';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService, CronLock } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { keptOffThePhone } from '../whatsapp/a-check-in-kept-off-the-phone';
import { whatToSendThisMorning, whichChase, whenItIsDue, itIsOverdue, itIsDueTomorrow, theTeamIsAlmostIn, yourViewMatters, itOpensSoon, MORNING_ORDER, itFollowsUpTheirPromise, theCheckInIsStillOpen } from '../whatsapp/what-goes-to-a-phone';
import { theirTimeZone } from '../whatsapp/the-persons-own-time-zone';
import { endTheMonthsThatHaveEnded } from '../board/the-anchor-month-end-event';
import { STARTED_FROM_THE_ANCHOR } from '../conversation/the-anchor-weekly-check-in';
import { sendWhoHasGoneQuiet as sendWhoHasGoneQuietToLeads } from '../engagement/who-has-gone-quiet';
import { sendTheReportFollowUps } from '../engagement/the-report-follow-up';
import { sendWhatGroundworkIsDoing as sendWhatGroundworkIsDoingToLeads } from '../engagement/waiting-on-the-people-you-invited';
import { whatTheLeadsWeeklyReportSays } from '../engagement/the-leads-own-weekly-report';
import { theFirstOpenDifference } from '../engagement/the-first-insight';
import { ReportsService } from '../reports/reports.service';
import { TheWeeklyReportService } from '../reports/the-weekly-report.service';
import { ModuleRef } from '@nestjs/core';
import { sendHeresWhatIsNew as sendHeresWhatIsNewToLeads } from '../engagement/heres-what-is-new';
import { theEngagementMoment } from '../engagement/the-engagement-release-moment';
import { sendTheParticipantsWeeks } from '../engagement/the-participants-week';
import { YourBoardService } from './your-board.service';
import { theOpenSession } from '../engagement/heres-what-is-new';
import { theRanOutOfTimeSubject } from '../engagement/the-leads-subjects-carry-the-facts';
import { sendTheTestCheckInMessages } from '../engagement/a-test-check-in-moves-on';
import { theirPromiseToFollowUp } from '../engagement/a-follow-up-from-their-own-record';
import { theOpeningNeverReachedThem, itHasBeenOpenLongEnough } from '../engagement/a-person-the-opening-never-reached';
import { formsOfTheSameNumber } from '../whatsapp/a-number-whatsapp-can-reach';
import { isEvaluationCheckIn } from '../reports/is-this-an-evaluation-check-in';
import { isNotLetInYet } from './who-an-admin-did-not-let-in';
import { theNamesOfReadersCheckIns } from './the-names-of-a-readers-check-ins';
import { isAWorkingDay } from './which-days-this-team-works';

/* Every kind a morning message is recorded under, sent, held or as a template. */
const MORNING_KINDS = ['overdue', 'due-tomorrow', 'team-almost-in', 'your-view-matters', 'anchor-follow-up'].flatMap((k) => [k, `${k}:template`, `${k}:held`]);
import { GroundworkEvents, CheckInCompletedEvent } from '../../common';
import { GroundStatus, CheckInStatus, TurnRole, PartyType, ReportActivationStatus } from '@prisma/client';
import { PatternsService } from '../patterns/patterns.service';
import { ConversationService } from '../conversation/conversation.service';
import { WARN_BEFORE_IT_LAPSES_DAYS } from '../participants/how-long-an-invite-lasts';
import { remindThemToCarryOn, warnTheirPhone, tellThemTheClockClosedIt, theLastRealTurn, THE_WARNING_TURN } from '../whatsapp/a-check-in-left-halfway';

const INACTIVITY_AUTO_CLOSE_MS = 12 * 60 * 60 * 1000;     // 12 hours
const MAX_SESSION_AGE_MS = 48 * 60 * 60 * 1000;            // 48 hours
const WARNING_WINDOW_START_MS = 11 * 60 * 60 * 1000;       // 11h of inactivity
const WARNING_WINDOW_END_MS = 11.5 * 60 * 60 * 1000;       // 11h30m of inactivity

/* One list, in one place: a-ground-that-has-ended.ts. */
/*
 * ...and a check-in that already stalled is skipped by every job that skips an ended one, exactly as on
 * the live main line, where STALLED sat in the ended list. Separating the two (so a person can reopen a
 * stalled check-in) must not make these jobs treat a stalled check-in as a live one: on release morning
 * that would email, remind, announce and WhatsApp people on check-ins that went quiet weeks ago. Once a
 * lead gives it more time it is no longer STALLED, and every job picks it up again.
 */
const TERMINAL: GroundStatus[] = A_GROUND_THE_JOBS_LEAVE_ALONE;
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
export class GroundsCron implements OnApplicationBootstrap {
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
    /* The three boards, read only for what waits for a lead to decide in their daily summary (decision 82, item 9). Optional and last for the same reason. */
    @Optional() private leave?: LeaveBoardService,
    @Optional() private timeSheets?: TimeSheetsService,
    @Optional() private spending?: SpendingService,
    /* The You board, read for each person's own week by email (decision 109). Optional and last for the same reason. */
    @Optional() private yourBoard?: YourBoardService,
    /* Finds the weekly report's service for the lead's weekly letter, without importing the module that imports this one. Optional and last for the same reason. */
    @Optional() private moduleRef?: ModuleRef,
  ) {}

  /**
   * THE FIRST START OF THIS VERSION WRITES THE RELEASE MOMENT (decision 74, item 7). See
   * the-release-moment.ts. Never throws: the warning job writes it too, if this could not.
   */
  async onApplicationBootstrap() {
    try {
      const at = await theReleaseMoment(this.prisma);
      this.logger.log(`Warnings that a check-in is about to run out of time go only to check-ins that reach that point after ${at.toISOString()}.`);
    } catch (err: any) {
      this.logger.warn(`The release moment could not be read or written yet: ${err?.message ?? err}`);
    }
    /* The engagement messages (decision 109) have a moment of their own, written once by the first start of this code. */
    try {
      const at = await theEngagementMoment(this.prisma);
      this.logger.log(`The engagement messages are only about what began after ${at.toISOString()}.`);
    } catch (err: any) {
      this.logger.warn(`The engagement moment could not be read or written yet: ${err?.message ?? err}`);
    }
  }

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
    await onceAcrossCopies(this.prisma, 'invite-joiners-who-start-today', theDay(), () => this.prisma.withAdvisoryLock(CronLock.DEFERRED_INVITES, async () => {
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
          /* Nor one still waiting for an admin to accept it: nobody is written to before the approval, and the approval sends it (known issue B5). */
          ground: { status: { notIn: [...TERMINAL, ...HELD, GroundStatus.AWAITING_APPROVAL] } },
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
    }));
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
    await onceAcrossCopies(this.prisma, 'warn-before-time-runs-out', theDay(), () => this.prisma.withAdvisoryLock(CronLock.STALL_GROUNDS, async () => {
      /*
       * NOT FOR WHAT REACHED THIS POINT BEFORE THE RELEASE (decision 74, item 7). See
       * the-release-moment.ts. When the moment cannot be read, nobody is emailed tonight.
       */
      let releasedAt: Date;
      try {
        releasedAt = await theReleaseMoment(this.prisma);
      } catch (err: any) {
        this.logger.error(`No warning was sent tonight, because the release moment could not be read: ${err?.message ?? err}`);
        return;
      }
      const candidates = await this.prisma.ground.findMany({
        where: {
          status: { notIn: [...TERMINAL, ...HELD, ...STOPPED] },
          stallWarningSentAt: null,
        },
        select: {
          id: true, label: true, createdAt: true, startsAt: true, timelineDays: true, runsUntilEnded: true,
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
        /* Already this close, or past its end, before the release: no email, no stamp, so it is not
           stalled either. It stays as it is until its lead ends or extends it. */
        if (reachedTheWarningPointBefore(deadline, DAYS_OF_NOTICE, releasedAt)) continue;
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
    }));
  }

  /**
   * THE ANCHOR'S MONTH END (decision 121, item 2). Half an hour after the stall sweep, so a check-in that has just been stalled is
   * caught the same night. Writes the event once for each anchor check-in whose month is over, and only while the anchor switch is on.
   */
  @Cron('30 3 * * *', { timeZone: 'UTC' })
  async endTheAnchorMonths() {
    await onceAcrossCopies(this.prisma, 'anchor-month-end', theDay(), () => this.endTheAnchorMonthsInner());
  }

  async endTheAnchorMonthsInner(now: Date = new Date()): Promise<{ ended: string[] }> {
    if (!(await theAnchorScenarioIsOn(this.prisma))) return { ended: [] };
    const result = await endTheMonthsThatHaveEnded(this.prisma, now).catch((err: any) => { this.logger.warn(`The anchor's month end could not be written: ${err?.message}`); return { ended: [] as string[] }; });
    if (result.ended.length) this.logger.log(`The month ended for ${result.ended.length} anchor check-in(s).`);
    return result;
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { timeZone: 'UTC' })
  async stallOverdueGrounds() {
    await onceAcrossCopies(this.prisma, 'stall-overdue-check-ins', theDay(), () => this.prisma.withAdvisoryLock(CronLock.STALL_GROUNDS, async () => {
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
        select: { id: true, createdAt: true, startsAt: true, timelineDays: true, runsUntilEnded: true, status: true },
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
        select: { id: true, label: true, initiatorId: true, participants: { select: { id: true, email: true, userId: true } } },
      });
      const frontend = this.config.get<string>('resend.frontendUrl') || '';
      for (const g of stalledGrounds) {
        /* Somebody on approved leave is not told they have let it lapse (week 23). */
        const away = await whoOnACheckInIsAway(this.prisma, g.id);
        /* WHERE IT STOOD, for the subject (decision 109 item 3): the count for everybody, and to the lead only, who had not checked in. */
        const stood = await theOpenSession(this.prisma, g.id, (g as any).initiatorId).catch(() => null);
        for (const p of g.participants) {
          if (away.has(p.id)) continue;
          const subject = theRanOutOfTimeSubject(g.label, stood, !!p.userId && p.userId === (g as any).initiatorId);
          await this.email
            .sendStalledNotification(p.email, g.label, `${frontend}/grounds/${g.id}`, subject)
            .catch((err: any) => this.logger.error(`Stalled notification failed for ground ${g.id}: ${err.message}`));
        }
      }
    }));
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
    await onceAcrossCopies(this.prisma, 'weekly-period-boundary', theWeek(), () => this.weeklyPeriodBoundaryHere());
  }

  private async weeklyPeriodBoundaryHere() {
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
    await onceAcrossCopies(this.prisma, 'weekly-concentration-risk', theWeek(), () => this.weeklyConcentrationRiskHere());
  }

  private async weeklyConcentrationRiskHere() {
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
      await this.closeTheSessionsNobodyOpenedInner(new Date()).catch((err) =>
        this.logger.error(`Could not close the sessions nobody opened: ${err?.message ?? err}`));
      await this.closeTheStaleOnes();
    });
  }

  /**
   * THE SESSIONS NOBODY OPENED, CLOSED AT THEIR ROUND'S CLOSE AS MISSED, and the next one made on the
   * check-in's own schedule (see a-session-nobody-opened.ts). Runs in the same half-hourly sweep, first, so
   * a person's next session is there the morning their next round opens.
   */
  async closeTheSessionsNobodyOpenedInner(now: Date): Promise<{ closed: number }> {
    const releaseMoment = await theReleaseMoment(this.prisma, now);
    const due = await theSessionsNobodyOpened(this.prisma, now, releaseMoment);
    let closed = 0;
    for (const s of due) {
      const done = await this.conversation.closeAsMissed(s.checkInId, s.closesAt).catch((err: any) => {
        this.logger.error(`Could not close session ${s.sessionNumber} (${s.checkInId}) nobody opened: ${err?.message ?? err}`);
        return false;
      });
      if (done) closed += 1;
    }
    if (closed > 0) this.logger.log(`Closed ${closed} session(s) nobody opened, at their round's close.`);
    return { closed };
  }

  private async closeTheStaleOnes() {
    {
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
        /* The 12 hours run from the last real word, never from the warning this job's sibling injects at 11 hours: that turn is the app's own, and counting it moved the close to about 23 hours. */
        const latestTurn = await theLastRealTurn(this.prisma, checkIn.id);

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
        /* Their phone is told it closed, with what they said kept, before the report follows (a-check-in-left-halfway.ts). */
        const toldTheirPhone = this.whatsapp && (await theHalfwayMessagesAreOn(this.prisma)) ? tellThemTheClockClosedIt(this.prisma, this.whatsapp, checkIn.id, absoluteStale ? 'age' : 'quiet').catch(() => false) : Promise.resolve(false);
        await toldTheirPhone;
        await this.conversation.closeByTheClock(checkIn.id);

        this.logger.warn(`Auto-closed check-in ${checkIn.id} (session ${checkIn.sessionNumber}): ${reason}`);
        closed++;
      }

      if (closed > 0) {
        this.logger.log(`Auto-close sweep: closed ${closed} stale check-in(s)`);
      }
    }
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
   * ONE REMINDER TO CARRY ON, for somebody who stopped halfway on WhatsApp (Hafsah, 5 October, night). After
   * three hours of quiet in the day, once per session. See whatsapp/a-check-in-left-halfway.ts.
   */
  @Cron('*/30 * * * *', { timeZone: 'UTC' })
  async remindThoseWhoStoppedHalfway() {
    /* One copy at a time, so two copies of the API never send the same reminder twice. */
    await this.prisma.withAdvisoryLock(CronLock.HALFWAY_REMINDERS, async () => { await this.remindThoseWhoStoppedHalfwayInner(new Date()); });
  }

  async remindThoseWhoStoppedHalfwayInner(now: Date): Promise<{ sent: number }> {
    /* Off at release (release.whatsappHalfwayMessages); see what-is-hidden-at-release.ts. */
    if (!this.whatsapp || !(await theHalfwayMessagesAreOn(this.prisma))) return { sent: 0 };
    const open = await this.prisma.checkIn.findMany({
      where: { status: CheckInStatus.IN_PROGRESS, ground: { status: { notIn: HELD } } },
      select: { id: true, warningFiredAt: true },
    });
    let sent = 0;
    for (const c of open) {
      try {
        /* After the 11-hour warning nothing is said but the close, and the quiet is counted from the last real turn. */
        if (c.warningFiredAt) continue;
        const last = await theLastRealTurn(this.prisma, c.id);
        if (last && now.getTime() - last.createdAt.getTime() >= WARNING_WINDOW_START_MS) continue;
        if (await remindThemToCarryOn(this.prisma, this.whatsapp, c, last as any, now)) sent++;
      } catch (err: any) {
        this.logger.warn(`The reminder to carry on could not be sent for check-in ${c.id}: ${err?.message}`);
      }
    }
    if (sent) this.logger.log(`WhatsApp: ${sent} reminder(s) to carry on a check-in.`);
    return { sent };
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
            content: THE_WARNING_TURN,
          },
        });

        await this.prisma.checkIn.update({
          where: { id: checkIn.id },
          data: { warningFiredAt: now },
        });
        /* And to their phone, when they were doing this session on WhatsApp (a-check-in-left-halfway.ts). */
        if (this.whatsapp && (await theHalfwayMessagesAreOn(this.prisma))) await warnTheirPhone(this.prisma, this.whatsapp, checkIn.id, now).catch(() => false);

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
    await onceAcrossCopies(this.prisma, 'tell-them-before-an-invite-lapses', theDay(), () => this.prisma.withAdvisoryLock(CronLock.INVITE_EXPIRY, async () => {
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
          const went = await this.email.sendInviteAboutToLapse(p.email, p.ground.label, this.email.buildInviteUrl(p.inviteToken!), p.id);
          /* Stamped only when it is on its way (sent, or held for the morning and sent then). One that was refused is tried again tomorrow, while there is still time to say it. */
          if (went !== 'suppressed') await this.prisma.groundParticipant.update({ where: { id: p.id }, data: { inviteExpiryWarnedAt: now } });
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
    }));
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
    await onceAcrossCopies(this.prisma, 'send-reminders', theDay(), () => this.prisma.withAdvisoryLock(CronLock.SEND_REMINDERS, async () => this.sendRemindersInner()));
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
    const nameFor = theNamesOfReadersCheckIns(this.prisma);
    await this.announceOpenedSessions(now);
    const frontend = this.config.get<string>('resend.frontendUrl') || '';

    const newlyOpen = await this.prisma.checkIn.findMany({
      where: {
        sessionNumber: { gt: 1 },
        status: CheckInStatus.NOT_STARTED,
        sessionReadyNotifiedAt: null,
        availableFrom: { lte: now },
        participant: { userId: { not: null }, ...NOT_HELD_FOR_A_SEAT, ground: { status: { notIn: A_GROUND_NO_MESSAGE_IS_ABOUT } } },
      },
      select: {
        id: true,
        groundId: true,
        participant: {
          select: {
            id: true,
            email: true,
            userId: true,
            ground: { select: { label: true, simplerWords: true } },
            /* No recordEntries here, structurally (NL-007): this sweep used to put the person's last
               private record line into the mail and the WhatsApp body as "Last time: ...". The product's
               central promise is that nothing they wrote reaches a mailbox; the reminder never needed it. */
            user: { select: { phoneNumber: true } },
          },
        },
      },
      take: 200,
    });

    /* Nobody on approved leave today is told a check-in is open. It is not stamped as told, so they
       hear on the first day they are back (week 23). */
    const leave = await leaveOfThePeopleOn(this.prisma, [...new Set(newlyOpen.map((c: any) => c.groundId).filter(Boolean))]);

    for (const ci of newlyOpen) {
      const p = ci.participant;
      if (awayUntilOn(leave.get(p.id), now)) continue;
      const checkInUrl = this.email.buildCheckInUrl(ci.id);
      try {
        /**
         * THE EMAIL. WhatsApp is in addition to email, never instead of it (her decision): this sends
         * the email whatever number the person has, and the WhatsApp notice for the same session is
         * the opening notice (webhooks.listener.ts, `announceOpenedSessions` below), which now goes for
         * every session on whichever number the organisation uses. This sweep used to send its own
         * WhatsApp message as well, so a person got two for one session (survey items 7 and 8).
         */
        await this.email.sendSessionReady(p.email, await nameFor({ userId: p.userId, email: p.email }, ci.groundId, p.ground.label), checkInUrl, p.ground.simplerWords);

        await this.prisma.checkIn.update({ where: { id: ci.id }, data: { sessionReadyNotifiedAt: now } });
      } catch (err: any) {
        this.logger.error(`Session-ready notification failed for check-in ${ci.id}: ${err.message}`);
      }
    }
  }

  /**
   * WHATSAPP REMINDERS AND NUDGES, IN HAFSAH'S WORDS (survey item 7, decisions 82 and 83).
   *
   * Nothing reminded anybody on WhatsApp. Every morning, half an hour after the email reminders, each
   * person with a check-in not yet answered gets at most ONE of these, the most useful first:
   *   - checkin_overdue, once, and only while the check-in is still open (late answers are taken);
   *   - checkin_due_tomorrow, once;
   *   - on the lead's chase days, by the email reminder's own rule: checkin_team_almost_in when at
   *     least half of the people who can answer have, checkin_your_view_matters when fewer have.
   * Never to somebody on approved leave, never about a check-in the lead keeps in the app, never to a
   * guest through an entry on the host's list. STOP, "Not now", how often Groundwork may write first
   * and the 24-hour window are the sender's (whatsapp.service.ts): outside the window it goes as the
   * approved template, and while that is not approved it is recorded as not sent, with the reason.
   */
  @Cron('30 8 * * *', { timeZone: 'UTC' })
  async sendWhatsAppReminders() {
    await onceAcrossCopies(this.prisma, 'send-whatsapp-reminders', theDay(), () => this.sendWhatsAppRemindersInner());
  }

  async sendWhatsAppRemindersInner(now: Date = new Date()): Promise<{ sent: number }> {
    const nameFor = theNamesOfReadersCheckIns(this.prisma);
    const waiting: any[] = await everyRowAPageAtATime((page) => this.prisma.checkIn.findMany({
      where: {
        status: CheckInStatus.NOT_STARTED,
        OR: [{ availableFrom: null }, { availableFrom: { lte: now } }],
        participant: { userId: { not: null }, ...NOT_HELD_FOR_A_SEAT, ground: { status: { notIn: [...TERMINAL, ...HELD] } } },
      },
      select: {
        id: true, groundId: true, sessionNumber: true, createdAt: true, availableFrom: true, participantId: true,
        ground: { select: { label: true, scenario: true, organizationId: true, overWhatsApp: true, cadence: true, chaseAfterDays: true, chasingStopped: true, tellTheLead: true, workingDays: true, startedFrom: true, simplerWords: true, initiatorId: true, initiator: { select: { firstName: true } } } },
        participant: { select: { id: true, email: true, userId: true, remindersStoppedAt: true, user: { select: { firstName: true, email: true, phoneNumber: true, isActive: true, deletedAt: true } } } },
      },
      ...page,
    }));
    const turnedOn = await organisationsThatTurnedWhatsAppOn(this.prisma, this.whatsapp, waiting.map((c) => c.ground.organizationId));
    const leave = await leaveOfThePeopleOn(this.prisma, [...new Set(waiting.map((c) => c.groundId))]);
    const hoursSince = (d: Date | null | undefined) => (d ? (now.getTime() - new Date(d).getTime()) / 3_600_000 : null);

    /* What each person could be sent, kept to the one most useful per person. */
    const best = new Map<string, { rank: number; go: () => Promise<unknown> }>();
    for (const ci of waiting) {
      try {
        if (keptOffThePhone(ci.ground)) continue;
        if (!turnedOn.has(ci.ground.organizationId)) continue;
        if (awayUntilOn(leave.get(ci.participantId), now)) continue;
        const user = ci.participant.user;
        if (user && (user.isActive === false || user.deletedAt)) continue;
        const before: { kind: string | null; createdAt: Date }[] = await this.prisma.whatsAppSend.findMany({
          /*
           * ONLY WHAT WENT, OR WAS HELD BY THE ADD-ON OR THE LIMIT. A message refused because the person had
           * said STOP, or because its template was not approved yet, reached nobody, and was written down
           * all the same. Counted as "had", it stopped the overdue and the due-tomorrow message for good:
           * after START, or once Meta approved the template, the person never read them.
           */
          where: { checkInId: ci.id, kind: { in: MORNING_KINDS }, OR: [{ sentAt: { not: null } }, { kind: { endsWith: ':held' } }] },
          orderBy: { createdAt: 'desc' },
          select: { kind: true, createdAt: true },
        });
        const had = new Set(before.map((b) => (b.kind ?? '').split(':')[0]));
        const lastChase = before.find((b) => /^(team-almost-in|your-view-matters|anchor-follow-up)/.test(b.kind ?? ''));
        const dueAt = whenItIsDue(ci.availableFrom ?? ci.createdAt, ci.ground.cadence);
        const what = whatToSendThisMorning({
          policy: { days: ci.ground.chaseAfterDays, stopped: ci.ground.chasingStopped, tellTheLead: ci.ground.tellTheLead },
          daysOpen: Math.floor((now.getTime() - new Date(ci.createdAt).getTime()) / 86_400_000),
          dueAt, now, alreadyHad: had, hoursSinceLastChase: hoursSince(lastChase?.createdAt),
        });
        /* No chase, overdue or due-tomorrow today: the only message left is the catch-up for somebody the opening notice never reached, and only if the lead has not stopped the chasing. */
        if (!what && (ci.ground.chasingStopped || !itHasBeenOpenLongEnough(ci.availableFrom ?? ci.createdAt, now))) continue;
        /* A team that said which days it works is not chased on the others (B-020). Nothing said: as before. */
        if (!isAWorkingDay(now, (ci.ground as any).workingDays)) continue;
        if (await isAGuestIn(this.prisma, ci.ground.organizationId, { userId: ci.participant.userId, email: ci.participant.email, userEmail: user?.email })) continue;
        const person = ci.participant.email
          ? await this.prisma.person.findFirst({ where: { organizationId: ci.ground.organizationId, email: ci.participant.email, active: true }, select: { phone: true } })
          : null;
        const phone = person?.phone ?? user?.phoneNumber ?? null;
        if (!phone) continue;
        const catchUp = !what;
        if (catchUp && !(await theOpeningNeverReachedThem(this.prisma, ci, formsOfTheSameNumber(phone), now))) continue;
        const who = { firstName: user?.firstName, label: await nameFor({ userId: ci.participant.userId, email: ci.participant.email }, ci.groundId, ci.ground.label) };
        let said;
        if (catchUp) said = theCheckInIsStillOpen(who, ci.ground.simplerWords);
        else if (what === 'overdue') said = itIsOverdue(who, ci.ground.simplerWords);
        else if (what === 'due-tomorrow') said = itIsDueTomorrow(who, dueAt!, ci.ground.simplerWords);
        else {
          /*
           * ON AN ANCHOR CHECK-IN, THE ANCHOR'S NUDGE (piece 30; decision 105 item 3): the person's own last open promise,
           * to them only, in place of the chase. Every gate above still holds, and the sender counts it as the day's one.
           */
          const theirs = await theirPromiseToFollowUp(this.prisma, { id: ci.groundId, startedFrom: ci.ground.startedFrom, scenario: ci.ground.scenario }, ci.createdAt, ci.participantId);
          if (theirs) said = itFollowsUpTheirPromise(who, theirs, ci.ground.simplerWords);
          else {
            const counts = await this.whoHasAnswered(ci.groundId, ci.sessionNumber);
            const chase = whichChase({ ...counts, aboutOnePerson: isEvaluationCheckIn(ci.ground.scenario) });
            said = chase === 'team-almost-in' ? theTeamIsAlmostIn(who, counts.answered, counts.ofHowMany, ci.ground.simplerWords) : yourViewMatters(who, ci.participant.userId && ci.participant.userId === (ci.ground as any).initiatorId ? 'you' : ci.ground.initiator?.firstName, ci.ground.simplerWords);
          }
        }
        /* The catch-up comes last: anything the chase would say today is more use to the person. */
        const rank = catchUp ? MORNING_ORDER.length : MORNING_ORDER.indexOf(what as any);
        const key = ci.participant.userId ?? phone;
        const kept = best.get(key);
        if (kept && kept.rank <= rank) continue;
        const message = said;
        best.set(key, { rank, go: () => this.whatsapp.sendFor(ci.ground.organizationId, phone, message.text, { checkInId: ci.id, kind: message.kind, params: message.params }) });
      } catch (err: any) {
        this.logger.warn(`WhatsApp reminder failed for check-in ${ci.id}: ${err?.message}`);
      }
    }
    let sent = 0;
    for (const { go } of best.values()) {
      try { await go(); sent++; } catch (err: any) { this.logger.warn(`WhatsApp reminder could not be sent: ${err?.message}`); }
    }
    if (sent) this.logger.log(`WhatsApp: ${sent} morning reminder(s) tried.`);
    return { sent };
  }

  /**
   * THE LEAD'S DAILY NUDGE (decision 120), at nine in the morning in Lagos, half an hour before the WhatsApp reminders and an hour before the email ones, so it is the lead's one
   * message of the day. It takes the place of the WhatsApp daily summary of decision 82 item 9: the same kind of message, the same limits (once a day, "not now", the 24 hours,
   * the template), with what is outstanding in place of the counts. It goes AFTER the lead's once-ever and weekly insights (what is new at half past six, the test check-in, the
   * follow-up after a report, what Groundwork is doing and who has gone quiet, from ten past eight to a quarter to nine): found on the test bed, a nudge that went first every
   * day starved all of them, because a lead with something outstanding is told something every day. On the days one of those goes, that is the lead's message; on the others,
   * this is. What it says and never says is in engagement/the-leads-daily-nudge.ts.
   */
  /**
   * MISSED CHECK-INS, TOLD TO THE PERSON FIRST (decision 136), at twenty to nine in Lagos: once per run of misses, by email. See engagement/missed-check-ins-told-first.ts.
   */
  @Cron('40 8 * * *', { timeZone: 'Africa/Lagos' })
  async sendTheMissedCheckIns() {
    await onceAcrossCopies(this.prisma, 'missed-check-ins', theDay(), () => this.sendTheMissedCheckInsInner());
  }

  async sendTheMissedCheckInsInner(now: Date = new Date()): Promise<{ tried: number }> {
    const result = await sendTheMissedCheckInsToThePeople(
      { prisma: this.prisma, email: this.email as any, frontendUrl: this.config.get<string>('resend.frontendUrl') || '' },
      now,
    ).catch((err: any) => { this.logger.warn(`The missed check-ins notices could not be sent: ${err?.message}`); return { tried: 0 }; });
    if (result.tried) this.logger.log(`Missed check-ins: ${result.tried} tried.`);
    return result;
  }

  @Cron('0 9 * * *', { timeZone: 'Africa/Lagos' })
  async sendTheLeadsDailyNudges() {
    await onceAcrossCopies(this.prisma, 'lead-daily-summary', theDay(), () => this.sendTheLeadsDailyNudgesInner());
  }

  async sendTheLeadsDailyNudgesInner(now: Date = new Date()): Promise<{ tried: number }> {
    const result = await sendTheLeadsDailyNudges(
      { prisma: this.prisma, whatsapp: this.whatsapp as any, email: this.email as any, boards: { leave: this.leave, timeSheets: this.timeSheets, spending: this.spending }, frontendUrl: this.config.get<string>('resend.frontendUrl') || '' },
      now,
    ).catch((err: any) => { this.logger.warn(`The leads' daily nudges could not be sent: ${err?.message}`); return { tried: 0 }; });
    if (result.tried) this.logger.log(`Lead daily nudge: ${result.tried} tried.`);
    return result;
  }

  /** The old name of the job, kept so the journeys and the test bed that call it by that name still run the one morning job. */
  async sendTheLeadsDailySummaries() { return this.sendTheLeadsDailyNudges(); }
  async sendTheLeadsDailySummariesInner(now: Date = new Date()) { return this.sendTheLeadsDailyNudgesInner(now); }

  /**
   * THE ANCHOR'S WEEKLY INSIGHT ON WHATSAPP (anchor piece 28), Friday at half past six in the morning in Lagos, before
   * the daily summary at seven, which it replaces that day (decision 105 item 2). Only while the anchor switch is on.
   */
  @Cron('30 6 * * 5', { timeZone: 'Africa/Lagos' })
  async sendTheAnchorWeeklyInsights() {
    await onceAcrossCopies(this.prisma, 'anchor-weekly-insight', theWeek(), () => this.sendTheAnchorWeeklyInsightsInner());
  }

  async sendTheAnchorWeeklyInsightsInner(now: Date = new Date()): Promise<{ tried: number }> {
    const result = await sendTheAnchorWeeklyInsights(
      { prisma: this.prisma, whatsapp: this.whatsapp, frontendUrl: this.config.get<string>('resend.frontendUrl') || '' },
      now,
    ).catch((err: any) => { this.logger.warn(`The anchor's weekly insights could not be sent: ${err?.message}`); return { tried: 0 }; });
    if (result.tried) this.logger.log(`WhatsApp: ${result.tried} anchor weekly insight(s) tried.`);
    return result;
  }

  /**
   * The lead's own weekly report for one check-in, as she is served it, or null. The service is looked up when it is needed and not injected, because the
   * reports module already imports this one and a module cannot import the one that imports it. It is read, never built: opening it rebuilds nothing.
   */
  private async theLeadsOwnWeeklyReport(g: { id: string; initiatorId: string }, now: Date) {
    const weekly = this.moduleRef?.get(TheWeeklyReportService, { strict: false });
    if (!weekly) return null;
    const lead = await this.prisma.user.findUnique({ where: { id: g.initiatorId }, select: { role: true, organizationId: true } }).catch(() => null);
    const read = await weekly.read(g.id, { userId: g.initiatorId, role: (lead as any)?.role ?? null, organizationId: (lead as any)?.organizationId ?? null }, now).catch(() => null);
    return whatTheLeadsWeeklyReportSays(read as any, now);
  }

  /**
   * THE LEAD'S WEEKLY LETTER BY EMAIL (anchor piece 29), Friday at three in the afternoon in Lagos, only
   * while the anchor switch is on. One letter per lead, from the past seven days of the check-ins they
   * started from the anchor link. What it says and never says is in email/the-leads-weekly-letter.ts.
   */
  @Cron('0 15 * * 5', { timeZone: 'Africa/Lagos' })
  async sendTheLeadsWeeklyLetters() {
    await onceAcrossCopies(this.prisma, 'lead-weekly-letter', theWeek(), () => this.sendTheLeadsWeeklyLettersInner());
  }

  async sendTheLeadsWeeklyLettersInner(now: Date = new Date()): Promise<{ tried: number }> {
    /* Every lead's check-ins, not the anchor's alone (engagement spec section 24). The anchor's own are kept only while its switch is on. */
    const anchorIsOn = await theAnchorScenarioIsOn(this.prisma);
    const result = await sendTheLeadsWeeklyLetters(
      {
        prisma: this.prisma, email: this.email, frontendUrl: this.config.get<string>('resend.frontendUrl') || '',
        everyCheckIn: { anchorIsOn, weeklyReport: (g, at) => this.theLeadsOwnWeeklyReport(g, at) },
      },
      now,
    ).catch((err: any) => { this.logger.warn(`The leads' weekly letters could not be sent: ${err?.message}`); return { tried: 0 }; });
    if (result.tried) this.logger.log(`Email: ${result.tried} weekly lead letter(s) tried.`);
    return result;
  }

  /**
   * A TEST CHECK-IN MOVES TOWARD ONE SMALL REAL ONE (decision 109 item 8), Tuesday at ten past eight in Lagos, before the morning's reminders (see below). Once ever per lead; see
   * engagement/a-test-check-in-moves-on.ts for what a test is and what is said.
   */
  @Cron('10 8 * * 2', { timeZone: 'Africa/Lagos' })
  async sendTheTestCheckInMessages() {
    await onceAcrossCopies(this.prisma, 'test-check-in-moves-on', theWeek(), () => this.sendTheTestCheckInMessagesInner());
  }

  async sendTheTestCheckInMessagesInner(now: Date = new Date()): Promise<{ tried: number }> {
    const result = await sendTheTestCheckInMessages(
      { prisma: this.prisma, email: this.email, frontendUrl: this.config.get<string>('resend.frontendUrl') || '' },
      now,
    ).catch((err: any) => { this.logger.warn(`The test check-in messages could not be sent: ${err?.message}`); return { tried: 0 }; });
    if (result.tried) this.logger.log(`Email: ${result.tried} test check-in message(s) tried.`);
    return result;
  }

  /**
   * THE FOLLOW-UP AFTER A REPORT (decision 109; section 36, journey 6), at a quarter past eight in Lagos on weekdays, before the morning's reminders (see below): a week after a report went out, once, to a
   * lead who has not opened a next session. See engagement/the-report-follow-up.ts.
   */
  @Cron('15 8 * * 1-5', { timeZone: 'Africa/Lagos' })
  async sendTheReportFollowUps() {
    await onceAcrossCopies(this.prisma, 'report-follow-up', theDay(), () => this.sendTheReportFollowUpsInner());
  }

  async sendTheReportFollowUpsInner(now: Date = new Date()): Promise<{ tried: number }> {
    const result = await sendTheReportFollowUps(
      {
        prisma: this.prisma, email: this.email, frontendUrl: this.config.get<string>('resend.frontendUrl') || '',
        /* The report as the lead is served it, found when it is needed (the reports module imports this one). */
        theDifference: async (r) => {
          const reports = this.moduleRef?.get(ReportsService, { strict: false });
          if (!reports) return null;
          return theFirstOpenDifference(await reports.sessionReport(r.groundId, r.lastReleasedSession, r.leadUserId, r.organizationId));
        },
      },
      now,
    ).catch((err: any) => { this.logger.warn(`The report follow-ups could not be sent: ${err?.message}`); return { tried: 0 }; });
    if (result.tried) this.logger.log(`Email: ${result.tried} report follow-up(s) tried.`);
    return result;
  }

  /**
   * WHO HAS GONE QUIET (decision 109; section 36, journeys 7 and 9), Wednesday at a quarter to nine in Lagos, before the morning's reminders (see below): once a week to a lead, as an insight about the
   * team or across her check-ins. See engagement/who-has-gone-quiet.ts.
   */
  @Cron('45 8 * * 3', { timeZone: 'Africa/Lagos' })
  async sendWhoHasGoneQuiet() {
    await onceAcrossCopies(this.prisma, 'who-has-gone-quiet', theWeek(), () => this.sendWhoHasGoneQuietInner());
  }

  async sendWhoHasGoneQuietInner(now: Date = new Date()): Promise<{ tried: number }> {
    const result = await sendWhoHasGoneQuietToLeads(
      { prisma: this.prisma, email: this.email, frontendUrl: this.config.get<string>('resend.frontendUrl') || '' },
      now,
    ).catch((err: any) => { this.logger.warn(`The "gone quiet" messages could not be sent: ${err?.message}`); return { tried: 0 }; });
    if (result.tried) this.logger.log(`Email: ${result.tried} "gone quiet" message(s) tried.`);
    return result;
  }

  /*
   * WHY THE LEAD'S INSIGHTS GO BEFORE THE MORNING'S REMINDERS (found on the test bed, 13 November). A person is sent one routine message a day (decision 109 item 6),
   * and the first to ask gets it. The reminders ran at 08:00 and 09:00 UTC and these at 09:00 to 10:30, so a lead who had a check-in of her own to answer was
   * reminded about it every morning, and the follow-up, the gone-quiet insight and "what Groundwork is doing" were refused that day and tried again the next, and
   * never went. They now run from 07:10 to 07:45 UTC (ten past eight to a quarter to nine in Lagos, which is after quiet hours end there and in East Africa), ahead
   * of the reminders.
   */
  /**
   * INVITED, AND NOBODY HAS STARTED (engagement spec section 5; journey 3), weekdays at half past eight in Lagos, before the morning's reminders (see below). On the first reminder day it says that
   * Groundwork is about to remind them; on later days, who has been reminded. Once per check-in. See engagement/waiting-on-the-people-you-invited.ts.
   */
  @Cron('30 8 * * 1-5', { timeZone: 'Africa/Lagos' })
  async sendWhatGroundworkIsDoing() {
    await onceAcrossCopies(this.prisma, 'what-groundwork-is-doing', theDay(), () => this.sendWhatGroundworkIsDoingInner());
  }

  async sendWhatGroundworkIsDoingInner(now: Date = new Date()): Promise<{ tried: number }> {
    const result = await sendWhatGroundworkIsDoingToLeads(
      { prisma: this.prisma, email: this.email, frontendUrl: this.config.get<string>('resend.frontendUrl') || '' },
      now,
    ).catch((err: any) => { this.logger.warn(`The "waiting on the people you invited" messages could not be sent: ${err?.message}`); return { tried: 0 }; });
    if (result.tried) this.logger.log(`Email: ${result.tried} "waiting on the people you invited" message(s) tried.`);
    return result;
  }

  /**
   * "HERE IS WHAT IS NEW", ONCE, to a lead who was already here (decision 109 item 2), early on weekdays in Lagos, ahead of the chase. Once ever per lead,
   * and only about check-ins made before the release that are still going. See engagement/heres-what-is-new.ts.
   */
  /* At half past six in Lagos: before the morning's reminders and summary, so that it is the lead's one message of the day and the chase is tried the next morning (it is announced once, and was held back for eight mornings by the chase going first). */
  @Cron('30 6 * * 1-5', { timeZone: 'Africa/Lagos' })
  async sendHeresWhatIsNew() {
    await onceAcrossCopies(this.prisma, 'heres-what-is-new', theDay(), () => this.sendHeresWhatIsNewInner());
  }

  async sendHeresWhatIsNewInner(now: Date = new Date()): Promise<{ tried: number }> {
    const result = await sendHeresWhatIsNewToLeads(
      { prisma: this.prisma, email: this.email, frontendUrl: this.config.get<string>('resend.frontendUrl') || '' },
      now,
    ).catch((err: any) => { this.logger.warn(`The "what is new" emails could not be sent: ${err?.message}`); return { tried: 0 }; });
    if (result.tried) this.logger.log(`Email: ${result.tried} "what is new" email(s) tried.`);
    return result;
  }

  /**
   * EVERY PERSON'S WEEK BY EMAIL (decision 109; spec 25), Thursday at a quarter past twelve in Lagos (not at the chase's hour), from their own You board and nothing else. See
   * engagement/the-participants-week.ts.
   */
  @Cron('15 12 * * 4', { timeZone: 'Africa/Lagos' })
  async sendTheParticipantsWeeks() {
    await onceAcrossCopies(this.prisma, 'participants-week', theWeek(), () => this.sendTheParticipantsWeeksInner());
  }

  async sendTheParticipantsWeeksInner(now: Date = new Date()): Promise<{ tried: number }> {
    if (!this.yourBoard) return { tried: 0 };
    const result = await sendTheParticipantsWeeks(
      { prisma: this.prisma, board: this.yourBoard, email: this.email, frontendUrl: this.config.get<string>('resend.frontendUrl') || '' },
      now,
    ).catch((err: any) => { this.logger.warn(`The participants' weeks could not be sent: ${err?.message}`); return { tried: 0 }; });
    if (result.tried) this.logger.log(`Email: ${result.tried} participant week(s) tried.`);
    return result;
  }

  /**
   * HOW MANY OF A SESSION'S PEOPLE HAVE CHECKED IN, for checkin_team_almost_in. Counts leave out
   * anybody not yet let in (decision 77) and anybody only managing; never anything anybody said.
   */
  private async whoHasAnswered(groundId: string, sessionNumber: number): Promise<{ answered: number; ofHowMany: number }> {
    const rows: any[] = await this.prisma.checkIn.findMany({
      where: { groundId, sessionNumber },
      select: { status: true, participant: { select: { managingOnly: true, partyType: true, user: { select: { awaitingOrgApproval: true } } } } },
    });
    /* Decision 133: the lead counts only when they checked in this session. */
    const counted = rows.filter((r) => (owesThisSession(r.participant) || r.status === CheckInStatus.COMPLETED) && !isNotLetInYet(r.participant));
    return { answered: counted.filter((r) => r.status === CheckInStatus.COMPLETED).length, ofHowMany: counted.length };
  }

  /**
   * checkin_opens_soon: an hour before a session opens at a set time, once. Every quarter of an hour,
   * for sessions opening between 45 and 60 minutes from now, with the same rules as the morning.
   */
  @Cron('*/15 * * * *', { timeZone: 'UTC' })
  async sendWhatsAppOpensSoon() {
    await this.sendWhatsAppOpensSoonInner().catch((err) => this.logger.warn(`WhatsApp opens-soon sweep failed: ${err?.message}`));
  }

  async sendWhatsAppOpensSoonInner(now: Date = new Date()): Promise<{ sent: number }> {
    const nameFor = theNamesOfReadersCheckIns(this.prisma);
    const soon: any[] = await everyRowAPageAtATime((page) => this.prisma.checkIn.findMany({
      where: {
        status: CheckInStatus.NOT_STARTED,
        availableFrom: { gt: new Date(now.getTime() + 45 * 60_000), lte: new Date(now.getTime() + 60 * 60_000) },
        participant: { userId: { not: null }, ...NOT_HELD_FOR_A_SEAT, ground: { status: { notIn: [...TERMINAL, ...HELD] } } },
      },
      select: {
        id: true, groundId: true, availableFrom: true, participantId: true,
        ground: { select: { label: true, organizationId: true, overWhatsApp: true, simplerWords: true } },
        participant: { select: { id: true, email: true, userId: true, user: { select: { firstName: true, email: true, phoneNumber: true, isActive: true, deletedAt: true } } } },
      },
      ...page,
    }), 200);
    const turnedOn = await organisationsThatTurnedWhatsAppOn(this.prisma, this.whatsapp, soon.map((c) => c.ground.organizationId));
    const leave = await leaveOfThePeopleOn(this.prisma, [...new Set(soon.map((c) => c.groundId))]);
    let sent = 0;
    for (const ci of soon) {
      try {
        if (keptOffThePhone(ci.ground)) continue;
        if (!turnedOn.has(ci.ground.organizationId)) continue;
        if (awayUntilOn(leave.get(ci.participantId), new Date(ci.availableFrom))) continue;
        const user = ci.participant.user;
        if (user && (user.isActive === false || user.deletedAt)) continue;
        const before = await this.prisma.whatsAppSend.findFirst({ where: { checkInId: ci.id, kind: { in: ['opens-soon', 'opens-soon:template'] } }, select: { id: true } });
        if (before) continue;
        if (await isAGuestIn(this.prisma, ci.ground.organizationId, { userId: ci.participant.userId, email: ci.participant.email, userEmail: user?.email })) continue;
        const person = ci.participant.email
          ? await this.prisma.person.findFirst({ where: { organizationId: ci.ground.organizationId, email: ci.participant.email, active: true }, select: { phone: true, timezone: true } })
          : null;
        const phone = person?.phone ?? user?.phoneNumber ?? null;
        if (!phone) continue;
        /* The hour in the person's own zone, with the zone named (B-140). */
        const said = itOpensSoon({ firstName: user?.firstName, label: await nameFor({ userId: ci.participant.userId, email: ci.participant.email }, ci.groundId, ci.ground.label) }, new Date(ci.availableFrom), ci.ground.simplerWords, theirTimeZone(person?.timezone, phone));
        await this.whatsapp.sendFor(ci.ground.organizationId, phone, said.text, { checkInId: ci.id, kind: said.kind, params: said.params });
        sent++;
      } catch (err: any) {
        this.logger.warn(`WhatsApp opens-soon failed for check-in ${ci.id}: ${err?.message}`);
      }
    }
    return { sent };
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
        participant: { userId: { not: null }, ...NOT_HELD_FOR_A_SEAT, ground: { status: { notIn: A_GROUND_NO_MESSAGE_IS_ABOUT } } },
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

    /*
     * 2. THE ACTIVATION REMINDER IS GONE (decision 109). It looked for grounds in REPORT_READY, a status that has not been written since June, so it never
     * fired, and the lead who sat on a report was never followed up. The follow-up after a report is its own sweep now (engagement/the-report-follow-up.ts),
     * from what the record shows changed.
     */
    const activationNudges = 0;

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
    // (NUDGE_THROTTLE_DAYS) and same opt-out (user.emailNotifications) as
    // every other reminder in this sweep.
    /*
     * IT NEVER STAMPS `lastNudgedAt` (decision 139, must-fix 3). That column says a reminder to CHECK IN went, and the lead's
     * letter and her "has not started" email say "reminded" from it. This mail stamped it too, so Wairimu read "I have already
     * sent reminders to Brian this week" in a week Brian was sent two of these and no reminder (final evaluation, profile 1).
     * Its own three-day wait is read from the record of messages instead, like its cap of two.
     */
    const pendingReveal = await this.prisma.groundParticipant.findMany({
      where: {
        userId: { not: null },
        ...NOT_HELD_FOR_A_SEAT,
        partyType: PartyType.PARTICIPANT,
        ground: { status: { notIn: A_GROUND_NO_MESSAGE_IS_ABOUT }, report: { releasedAt: { not: null } } },
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
        /* At most two for a person and a report (decision 117, D14). Not being able to count is not leave to send. */
        if ((await howManyReportReadyRemindersWereSent(this.prisma as any, p.email, p.ground.label)) >= THE_MOST_REPORT_READY_REMINDERS) continue;
        /* Not again within NUDGE_THROTTLE_DAYS of the last one that went, read from the record of messages. */
        if ((await howManyReportReadyRemindersWereSent(this.prisma as any, p.email, p.ground.label, throttleBefore)) > 0) continue;
        await this.email.sendActivationRevealReminder(p.email, p.ground.label, `${frontend}/grounds/${p.ground.id}/report`);
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
    await onceAcrossCopies(this.prisma, 'synthesis-backstop', theDay(), () => this.prisma.withAdvisoryLock(CronLock.SYNTHESIS_BACKSTOP, async () => {
      const grounds = await this.prisma.ground.findMany({
        where: { status: { notIn: [...TERMINAL, ...HELD] } },
        select: { id: true },
      });

      let triggered = 0;
      for (const g of grounds) {
        const parties = await this.prisma.groundParticipant.findMany({
          /* Decision 133: the round never waits on the lead, who checks in when they choose. A lead and
             one colleague is still two people, so one colleague is enough to look at. */
          where: { groundId: g.id, managingOnly: false, partyType: PartyType.PARTICIPANT },
          select: { id: true },
        });
        if (parties.length < 1) continue;
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
        /* Somebody on approved leave today is not waited on (week 23). */
        const away = await whoOnACheckInIsAway(this.prisma, g.id);
        for (const [sessionNumber, rows] of rounds) {
          const spoke = new Set(rows.map((r) => r.participantId));
          if (parties.some((p) => !spoke.has(p.id) && !away.has(p.id))) continue;
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
    }));
  }

  /**
   * GW-50 post-resolution feedback - 10 AM daily. ~24h after a ground closes,
   * invite each party (who hasn't already submitted feedback) to answer one
   * question about whether the process felt fair. The 24-72h window sends once
   * per party without a dedicated schema column.
   */
  @Cron('0 10 * * *', { timeZone: 'UTC' })
  async sendFeedbackRequests() {
    await onceAcrossCopies(this.prisma, 'send-feedback-requests', theDay(), () => this.sendFeedbackRequestsHere());
  }

  private async sendFeedbackRequestsHere() {
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
