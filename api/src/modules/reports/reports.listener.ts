import { nameToCall } from '../engagement/a-name-to-call-them';
import { isNotLetInYet } from '../grounds/who-an-admin-did-not-let-in';
import { whoIsLeftToCheckIn } from '../email/who-has-not-checked-in-yet';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GroundsService } from '../grounds';
import { ReportsService } from './reports.service';
import { TheWeeklyReportService } from './the-weekly-report.service';
import { EmailService } from '../email/email.service';
import { GroundworkEvents, CheckInCompletedEvent, GroundActivatedEvent } from '../../common';
import { GroundStatus, PartyType, ReportActivationStatus, CheckInStatus } from '@prisma/client';
import { hasEnded, isHeld, hasStalled, isShut } from '../grounds/a-ground-that-has-ended';

/**
 * Bridges domain events to report generation. Lives in the reports module so
 * the emitters (conversation, grounds) never import reports - no cycle.
 *
 * Flow:
 *   checkin.completed  -> when ALL parties finish any session:
 *                           synthesize the report and move the ground to ACTIVE.
 *                           No payment gate between sessions.
 *   ground.activated   -> synthesize if needed, then release report.
 */
@Injectable()
export class ReportsListener {
  private readonly logger = new Logger(ReportsListener.name);
  private readonly findingsKeptFrom = new WeakSet<object>();

  constructor(
    private prisma: PrismaService,
    private grounds: GroundsService,
    private reports: ReportsService,
    private email: EmailService,
    private config: ConfigService,
    @Optional() private weekly?: TheWeeklyReportService,
  ) {}

  @OnEvent(GroundworkEvents.CHECK_IN_COMPLETED)
  async onCheckInCompleted(event: CheckInCompletedEvent) {
    // Notify the admin when any participant checks in (best-effort, never blocks report flow)
    /* A repair is not news to the admin: the backstop re-emitting a lost event must not re-send "X has checked in". */
    if (event.source !== 'repair') this.notifyAdminOnCheckIn(event).catch((err: any) =>
      this.logger.warn(`Admin check-in notification failed for ground ${event.groundId}: ${err.message}`),
    );

    // Notify the other party if this was a self-correction session started
    // after sign-off, landing after they had already activated the shared
    // report (best-effort, never blocks report flow).
    this.notifyOnLateCorrection(event).catch((err: any) =>
      this.logger.warn(`Late-correction notification failed for ground ${event.groundId}: ${err.message}`),
    );

    try {
      const sessionNumber = event.sessionNumber;

      // Build/update the picture as soon as ANYONE checks in - it forms
      // progressively rather than waiting for every party. The synthesis
      // rules already forbid attributing positions to parties who haven't
      // contributed yet (rule 3), so a partial picture never fabricates
      // agreement that isn't there - it just shows what's known so far.
      await this.reports.synthesize(event.groundId);

      /* THE WEEKLY REPORT AGAIN, NOW THAT THE SESSION'S REPORT IS IN, so what it keeps (what only the lead
         can settle, where people said different things) reads the newest report. Never on opening. */
      await this.weekly?.build(event.groundId).catch((err: any) =>
        this.logger.warn(`The weekly report for ${event.groundId} could not be built after the report: ${err?.message}`),
      );

      /*
       * WORD THE READS NOW, NOT WHEN SOMEBODY OPENS THE PAGE. The session report and the shared
       * report hand their drafts to the model for wording, and the worded lines are kept by their
       * hash. Reading them here, for everybody who will read them, means the first open after a
       * check-in costs a lookup rather than ten seconds. Best effort and off the critical path: a
       * warm-up that fails leaves the page exactly as slow as it was, never broken.
       *
       * AFTER THE RELEASE, NOT BEFORE IT (decision 44). Warming here and then releasing warmed the
       * same report twice, once as it stood and once released, both asking the model at once. Now
       * it is asked for once the release has happened or been ruled out, and a release's own
       * warm-up and this one are the same run (ReportsService.wordTheReadsFor).
       */
      const warm = () => this.warmTheReads(event.groundId, sessionNumber).catch((err: any) =>
        this.logger.warn(`Warming the reads for ${event.groundId} failed: ${err?.message}`),
      );

      const allDone = await this.grounds.isSessionReadyForReport(event.groundId, sessionNumber);
      /*
       * SOMEBODY WHO ANSWERS AFTER THE REPORT HAS RELEASED STILL GETS THEIR LINK. An open link releases
       * at the first answers that make a round; the forty-eight who answer afterwards were told nothing.
       * The report they were promised exists, so it goes to them now. See tellThemTheReportIsReady.
       */
      if (!allDone) {
        warm();
        const rep = await this.prisma.report.findUnique({ where: { groundId: event.groundId }, select: { releasedAt: true } });
        if (rep?.releasedAt && event.participantId) {
          await this.reports.tellThemTheReportIsReady(event.groundId, sessionNumber, event.participantId).catch((err: any) =>
            this.logger.warn(`Telling a late answerer on ${event.groundId} failed: ${err?.message}`),
          );
        }
        return;
      }

      // Once everyone is through, this is the real moment: mutual reveal,
      // billing activation, "your report is ready" notifications.
      this.logger.log(`All parties through session ${sessionNumber}. Releasing report and activating ground ${event.groundId}.`);
      const g = await this.prisma.ground.findUnique({ where: { id: event.groundId }, select: { organizationId: true, status: true } });
      if (g) {
        await this.reports.release(event.groundId, g.organizationId);
        /* release() now releases this session's picture on its own and tells people itself (decision 76, item 4);
           this stays as the backstop for anybody it missed. Once per person per round, so nobody is told twice. */
        await this.reports.tellThemTheReportIsReady(event.groundId, sessionNumber).catch((err: any) =>
          this.logger.warn(`Telling the round on ${event.groundId} failed: ${err?.message}`),
        );
        /*
         * THE REPORT OF THE LAST SESSION MUST NOT REOPEN THE GROUND. Releasing normally means the
         * ground is live, and for the closing session it is the opposite: the report lands after
         * the decision. Watched live - a CLOSED ground was set back to ACTIVE here, seconds after
         * the lead ended it. See a-ground-that-has-ended.ts.
         *
         * NOR MAY IT LIFT A HOLD. A paused ground whose last participant finishes is still paused;
         * the report is released and the hold stands until somebody resumes it on purpose.
         */
        /* And a stalled one, for the same reason as a held one: releasing a report used to set a
           ground ACTIVE, and doing that to a check-in that ran out of time would revive it without
           anybody deciding to - which is the fault this whole change is about, in reverse. */
        if (isShut(g.status)) {
          this.logger.log(
            `Ground ${event.groundId} is ${g.status} (${hasEnded(g.status) ? 'ended' : hasStalled(g.status) ? 'out of time' : 'held'}); report released and the status left as it is.`,
          );
        } else {
          await this.prisma.ground.update({ where: { id: event.groundId }, data: { status: GroundStatus.ACTIVE } });
        }
      }
      warm();
    } catch (err: any) {
      this.logger.error(`Report handling on checkin.completed failed for ground ${event.groundId}: ${err.message}`);
    }
  }

  private async warmTheReads(groundId: string, sessionNumber: number) {
    /* Every reader's report and session report, worded now with the model allowed. Opening them
       later asks no model (decision 7): see ReportsService.wordTheReadsFor. */
    const read = await this.reports.wordTheReadsFor(groundId, sessionNumber);
    /* Several triggers share one warm-up and are handed the same result: its finding is kept once. */
    if (this.findingsKeptFrom.has(read)) return;
    this.findingsKeptFrom.add(read);
    let kept = false;
    for (const { sessionReport: said } of read) {
      /*
       * AND THE ROUND KEEPS WHAT IT FOUND, once, while it is in hand.
       *
       * The finding is picked from the round's own drafts and was then thrown away, so the only
       * place it existed was a page somebody had open. The check-in list showed each ground's brief
       * instead - the sentence it was set up with - and four goal check-ins read identically.
       *
       * Here rather than on a read, because a read must not write, and rather than in synthesis,
       * because synthesis does not build the drafts the finding is picked from. This loop already
       * computes the report for every reader; the first one that produces a finding is the round's.
       */
      if (!kept && (said as any)?.finding?.text) {
        kept = true;
        await this.prisma.reportRound.updateMany({
          where: { groundId, sessionNumber },
          data: { finding: String((said as any).finding.text) },
        }).catch((err: any) => this.logger.warn(`Keeping the finding for ${groundId} failed: ${err?.message}`));
      }
    }
  }

  @OnEvent(GroundworkEvents.GROUND_ACTIVATED)
  async onGroundActivated(event: GroundActivatedEvent) {
    try {
      this.logger.log(`Ground ${event.groundId} activated - synthesizing (if needed) and releasing report`);
      const g = await this.prisma.ground.findUnique({ where: { id: event.groundId }, select: { organizationId: true } });
      if (!g) return;
      // For session 2+, the report hasn't been synthesized yet - do it now on activation.
      const existing = await this.prisma.report.findUnique({ where: { groundId: event.groundId } });
      if (!existing || !existing.releasedAt) {
        await this.reports.synthesize(event.groundId);
      }
      await this.reports.release(event.groundId, g.organizationId);
    } catch (err: any) {
      this.logger.error(`Report release on ground.activated failed for ground ${event.groundId}: ${err.message}`);
    }

    /*
     * ONE REPORT, ONE MESSAGE (NL-005). release() above mails every participant that the shared record
     * is ready, with the report link. This then mailed every participant a second time, seconds later,
     * saying the same thing and pointing at the check-in instead, and neither said which to open. The
     * second mail and its sender are gone; the report mail is the one.
     */
  }

  private async notifyAdminOnCheckIn(event: CheckInCompletedEvent): Promise<void> {
    /*
     * BY NAME, AND WITH THE TRUE COUNT. The lead read "adamu@r1789...adversarial.test has checked in",
     * twenty-four times, each one ending "Everyone has now checked in. The shared report is ready to
     * go out" - because the person's name was never fetched and the pending count was never passed
     * (21 Sep 2026). The name is the one the roster shows; the count is who has no completed check-in
     * for this session yet, leaving out anybody who only manages.
     */
    const ground = await this.prisma.ground.findUnique({
      where: { id: event.groundId },
      select: {
        label: true,
        initiator: { select: { email: true } },
        participants: {
          select: {
            id: true, managingOnly: true,
            user: { select: { email: true, firstName: true, lastName: true, isActive: true, deletedAt: true, awaitingOrgApproval: true } },
            checkIns: { where: { sessionNumber: event.sessionNumber, status: CheckInStatus.COMPLETED }, select: { id: true } },
          },
        },
      },
    });
    if (!ground?.initiator?.email) return;

    const who = ground.participants.find((p) => p.id === event.participantId);
    const participantEmail = who?.user?.email;
    if (!participantEmail || participantEmail === ground.initiator.email) return;
    const participantName = [who?.user?.firstName, who?.user?.lastName].filter((x) => x?.trim()).join(' ').trim() || participantEmail;
    /* Counted now, and without the person who just checked in, the lead reading this, and anybody not expected (who-has-not-checked-in-yet.ts). */
    const stillPending = whoIsLeftToCheckIn(ground.participants as any, { justCheckedIn: event.participantId, readerEmail: ground.initiator.email });

    const frontendUrl = this.config.get<string>('resend.frontendUrl') || 'http://localhost:5173';
    const groundUrl = `${frontendUrl}/grounds/${event.groundId}`;
    /* WHO IS IN, for the lead's honest read of a partial picture (decision 109, journey 4): first names of the people who can answer and have, and how many can. */
    const counted = ground.participants.filter((p) => !p.managingOnly && !isNotLetInYet(p as any) && p.user?.isActive !== false && !p.user?.deletedAt);
    /* The lead is "you", first, as she is everywhere she reads herself. */
    const nameOf = (p: (typeof counted)[number]) => (p.user?.email === ground.initiator.email ? 'you' : nameToCall({ user: p.user as any }));
    const answered = counted.filter((p) => p.checkIns.length > 0).map(nameOf).filter((x) => !!x).sort((a, b) => (a === 'you' ? -1 : b === 'you' ? 1 : 0));
    await this.email.sendParticipantCheckedIn(ground.initiator.email, participantName, ground.label, groundUrl, stillPending, { answered, ofHowMany: counted.length });
  }

  /**
   * Honest Corrections: if the completed check-in is a self-correction session
   * that was stamped isPostSignOff (started after the correcting participant
   * had already signed off - see GroundsService.signOff /
   * ConversationService.startSelfCorrectionSession), and the OTHER party has
   * already activated the shared report, that party may have already made
   * decisions based on what they saw. Tell them something changed - never
   * what, only that it did (see reports.service.ts's `updates` field and
   * EmailService.sendLateCorrectionNotice).
   */
  private async notifyOnLateCorrection(event: CheckInCompletedEvent): Promise<void> {
    const checkIn = await this.prisma.checkIn.findUnique({
      where: { id: event.checkInId },
      select: { isPostSignOff: true },
    });
    if (!checkIn?.isPostSignOff) return;

    const ground = await this.prisma.ground.findUnique({
      where: { id: event.groundId },
      select: {
        label: true,
        participants: { select: { id: true, user: { select: { email: true } } } },
      },
    });
    if (!ground) return;

    const others = ground.participants.filter((p) => p.id !== event.participantId && p.user?.email);
    if (!others.length) return;

    const activations = await this.prisma.reportActivation.findMany({
      where: { groundId: event.groundId, participantId: { in: others.map((p) => p.id) }, status: ReportActivationStatus.ACTIVATED },
      select: { participantId: true },
    });
    const activatedIds = new Set(activations.map((a) => a.participantId));
    const alreadySaw = others.filter((p) => activatedIds.has(p.id));
    if (!alreadySaw.length) return;

    const frontendUrl = this.config.get<string>('resend.frontendUrl') || 'http://localhost:5173';
    const groundUrl = `${frontendUrl}/grounds/${event.groundId}`;
    await Promise.all(
      alreadySaw.map((p) =>
        this.email
          .sendLateCorrectionNotice(p.user!.email, ground.label, groundUrl)
          .catch((err: any) => this.logger.error(`Failed to notify ${p.user!.email} of late correction: ${err.message}`)),
      ),
    );
  }
}
