import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { onceAcrossCopies, theDay } from '../prisma/once-across-copies';
import { awayUntilOn, fallsInLeave, leaveOfThePeopleOn, theirApprovedLeave, whoOnACheckInIsAway } from '../suites/who-is-away';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CheckInStatus } from '@prisma/client';
import { worthNudging, whatToSendThem } from './who-is-worth-nudging';
import { theAnchorNudgeFor } from './the-anchor-nudge';
import { WorkspaceNotifierService } from '../workspace/workspace-notifier.service';
import {
  whatToDoToday,
  theEmailForTheLead,
  ChasingPolicy,
} from './chasing-belongs-to-the-lead';

/*
 * The schedule is the GROUND'S, not this file's. See
 * `chasing-belongs-to-the-lead.ts`: a week-long handover and a quarter-long
 * delivery were chased on the same three days because the days lived here.
 */

@Injectable()
export class RemindService {
  private readonly logger = new Logger(RemindService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    /* The channel, where one is connected. Four kinds of notice were defined and one was ever
       sent; "people have a check-in waiting" is the second. */
    private workspace: WorkspaceNotifierService,
  ) {}

  /**
   * Send a nudge email to every participant on the ground who has NOT yet
   * completed a check-in for the current session. Only the requesting user -
   * who must themselves be a party to this ground - may trigger a reminder.
   *
   * The check-in id is used as the lookup key because the front-end typically
   * knows the check-in id, not the ground id.
   *
   * #34: If the other party has already completed their check-in, the nudge
   * email includes a note that their version is the only thing missing.
   */
  async sendReminder(checkInId: string, requestingUserId: string): Promise<{ sent: boolean; count: number; reinvited: number }> {
    // Load the check-in to get the ground.
    const checkIn = await this.prisma.checkIn.findUnique({
      where: { id: checkInId },
      select: { groundId: true, sessionNumber: true },
    });
    if (!checkIn) throw new NotFoundException('Check-in not found');

    const ground = await this.prisma.ground.findUnique({
      where: { id: checkIn.groundId },
      select: { id: true, label: true, startedFrom: true },
    });
    if (!ground) throw new NotFoundException('Check-in not found');

    // Verify the requesting user is a party to this ground.
    const requesterLink = await this.prisma.groundParticipant.findFirst({
      where: { groundId: ground.id, userId: requestingUserId },
    });
    if (!requesterLink) {
      throw new ForbiddenException('You are not a participant in this check-in');
    }

    /* Whose name an invitation is sent in, if one is sent below. A re-invitation from "A founder"
       is the mail somebody deletes. */
    const requester = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { firstName: true },
    });
    const requesterName = requester?.firstName ?? 'A colleague';

    /*
     * EVERY OTHER PARTY, INCLUDING THE ONES WHO NEVER ACCEPTED.
     *
     * This required `userId: { not: null }` — so the person a lead most wants to chase, the one who
     * has not opened their invitation, was the one the button could not reach. Pressing "remind"
     * did nothing for them and said it had reminded nobody; the lead's only move was to add them a
     * second time and hope. They are included now and sent their INVITATION again rather than a
     * nudge, because a nudge links to a check-in they cannot open. See `whatToSendThem`.
     *
     * The requester is still excluded: "remind" chases the other party, never yourself.
     */
    const allParticipants = await this.prisma.groundParticipant.findMany({
      where: {
        groundId: ground.id,
        OR: [{ userId: null }, { userId: { notIn: [requestingUserId] } }],
      },
      select: {
        id: true,
        email: true,
        userId: true,
        lastNudgedAt: true,
        /* Selected, not cast. `(p as any).managingOnly` reads undefined off a row that never
           carried the column, so the exclusion would have been permanently false — the fault this
           is fixing, wearing the fix's clothes. */
        managingOnly: true,
        /* Selected for the same reason managingOnly is: a column the row never carried reads
           undefined, and the whole point of this one is to stop a mail. */
        remindersStoppedAt: true,
        /* For the invitation path: the token is the same one their first mail carried. */
        inviteToken: true,
        invitedAt: true,
        user: { select: { firstName: true, emailNotifications: true, isActive: true, deletedAt: true } },
        checkIns: {
          where: { sessionNumber: checkIn.sessionNumber },
          select: { id: true, status: true },
        },
      },
    });

    // #34: Determine whether the other party has already completed their check-in.
    const otherPartyCompleted = allParticipants.some((p) => {
      const session = p.checkIns[0];
      return session && session.status === CheckInStatus.COMPLETED;
    });

    /*
     * NOT SIMPLY "NOT COMPLETED". See who-is-worth-nudging.ts — that test also said yes to
     * somebody who declined, to a managing-only lead who has no check-in by design, and to
     * anybody with no check-in for this session, whose reminder link was then built out of an
     * empty string and pointed at nothing.
     */
    const considered = allParticipants.map((p) => ({
      ...p,
      session: p.checkIns[0] ? { id: p.checkIns[0].id, status: p.checkIns[0].status as any } : null,
      managingOnly: p.managingOnly,
      hasAccepted: p.userId !== null,
      /* A leaver's address may now belong to somebody else. Undefined for an invitee with no
         account yet, which is not the same as deactivated. */
      stillHere: p.user ? p.user.isActive && !p.user.deletedAt : undefined,
      emailNotifications: p.user?.emailNotifications ?? null,
      hoursSinceLastNudge: p.lastNudgedAt
        ? (Date.now() - p.lastNudgedAt.getTime()) / (1000 * 60 * 60)
        : null,
    }));
    /* Somebody on approved leave today is not chased (week 23). */
    const awayToday = await whoOnACheckInIsAway(this.prisma as any, ground.id);
    const incomplete = worthNudging(considered).filter((p: any) => !awayToday.has(p.id));

    let count = 0;
    let reinvited = 0;
    const frontendUrl = (this.email as any).frontendUrl ?? 'http://localhost:5173';

    for (const participant of incomplete) {
      /* The switch and the once-a-day throttle are both decided by whyNotNudge above, so they are
         not re-tested here — two copies of the same rule is how they come apart. */

      /* THROUGH THE HELPER, BECAUSE THIS FILE GOT THE PATH WRONG.
         It hand-built `/check-ins/:id` and the client route is `/checkin/:id`, so every
         reminder this service has ever sent landed on the not-found page. The helper is
         the one place that knows, and reaching past it into `frontendUrl` is what let the
         two drift. */
      const specificThing = `session ${checkIn.sessionNumber} on "${ground.label}"`;

      if (whatToSendThem(participant).send === 'their invitation again') {
        /*
         * THEIR INVITATION, NOT A NUDGE. They have no account, so a link to their own check-in
         * opens a sign-in page they have no password for. The token is the one their first mail
         * carried — see the note in grounds.service on why re-minting kills the live link.
         */
        if (!participant.inviteToken) {
          this.logger.warn(`Cannot re-invite participant ${participant.id}: no invite token on the row.`);
          continue;
        }
        await this.email.sendParticipantInvite(
          participant.email,
          requesterName,
          ground.label,
          participant.inviteToken,
          undefined,
          { kind: 'PARTICIPANT_INVITE', participantId: participant.id, groundId: ground.id },
        );
        await this.prisma.groundParticipant.update({
          where: { id: participant.id },
          data: { lastNudgedAt: new Date(), notifiedAt: new Date() },
        });
        reinvited++;
        count++;
        continue;
      }

      /* `session.id` is guaranteed present by whyNotNudge for anybody who has accepted, which
         refuses a party without one rather than building a link out of an empty string. */
      const checkInUrl = this.email.buildCheckInUrl(participant.session!.id);

      // #34: Pass otherPartyCompleted so the email includes the appropriate note.
      /* Their own last open promise, to them only, on an anchor check-in (piece 30). */
      const theAnchorLine = await theAnchorNudgeFor(this.prisma, ground as any, participant.id);
      await this.email.sendNudge(participant.email, specificThing, checkInUrl, undefined, otherPartyCompleted, theAnchorLine, participant.id);

      await this.prisma.groundParticipant.update({
        where: { id: participant.id },
        data: { lastNudgedAt: new Date() },
      });

      count++;
    }

    /*
     * `reinvited` is reported so the client can say which of the two happened. "Reminded 2 people"
     * where one of them was actually re-invited is a small lie that matters: the lead is deciding
     * whether to chase somebody another way.
     */
    return { sent: true, count, reinvited };
  }

  /**
   * #71 - Scheduled nudges at Day 3, Day 7, and Day 14 after a check-in is
   * opened with NOT_STARTED status. Runs daily at 8 AM. For each NOT_STARTED
   * check-in, calculates days elapsed since createdAt and sends the nudge if
   * the elapsed days exactly match one of the thresholds and the participant
   * has not been nudged in the past 24 hours.
   *
   * #72 - Consecutive absence tracking: after sending a Day-14 nudge (third
   * threshold), checks whether this participant has missed 3 or more consecutive
   * check-ins (NOT_STARTED sessions whose period has ended). If so, sends an
   * absence reminder naming the ground and the missed count.
   *
   * #34 - If the other party on the same ground/session has already completed
   * their check-in, includes "The other party has already submitted their
   * version. Your record is the only thing missing." in the nudge body.
   */
  // timeZone pinned to UTC - previously implicit, same fix as grounds.cron.ts.
  @Cron(CronExpression.EVERY_DAY_AT_8AM, { timeZone: 'UTC' })
  async sendScheduledNudges(): Promise<void> {
    /* Once for its time across every copy of the API (decision 74, item 7). */
    await onceAcrossCopies(this.prisma, 'send-scheduled-nudges', theDay(), () => this.sendScheduledNudgesHere());
  }

  private async sendScheduledNudgesHere(): Promise<void> {
    const now = new Date();
    const frontendUrl = (this.email as any).frontendUrl ?? 'http://localhost:5173';

    // Load all NOT_STARTED check-ins with participant and ground context.
    const notStarted = await this.prisma.checkIn.findMany({
      where: { status: CheckInStatus.NOT_STARTED },
      select: {
        id: true,
        createdAt: true,
        sessionNumber: true,
        availableFrom: true,
        participantId: true,
        groundId: true,
        leadToldAt: true,
        ground: {
          select: {
            label: true,
            /* Whether it is an anchor check-in, for the anchor's nudge (piece 30). */
            startedFrom: true,
            /* The lead set the check-in to use simpler words: the reminder email says it in the plainer form. */
            simplerWords: true,
            /* For the channel notice: `tell` is scoped to an organisation. */
            organizationId: true,
            chaseAfterDays: true,
            chasingStopped: true,
            tellTheLead: true,
            initiator: { select: { email: true, firstName: true } },
          },
        },
        participant: {
          select: {
            id: true,
            email: true,
            lastNudgedAt: true,
            user: { select: { firstName: true, emailNotifications: true, isActive: true, deletedAt: true } },
          },
        },
      },
    });

    /* Who the lead should hear about, gathered as we go and sent as ONE email per
       ground below. A mail per person is the same chase with the lead as its
       target. */
    const forTheLead = new Map<string, {
      to: string; leadName: string | null; label: string; chasedOn: number[];
      who: string[]; checkInIds: string[];
      /* For the channel notice: `tell` is scoped to an organisation, not to a ground. */
      organizationId: string;
    }>();

    /* Approved leave, for every person in the sweep, in one read (week 23). */
    const leave = await leaveOfThePeopleOn(this.prisma as any, [...new Set(notStarted.map((c) => c.groundId))]);

    for (const checkIn of notStarted) {
      // Skip if not yet available.
      if (checkIn.availableFrom && checkIn.availableFrom > now) continue;
      /* Nobody on approved leave today is nudged, or counted among the people the lead is told have
         not started. The round does not wait for them. */
      if (checkIn.participantId && awayUntilOn(leave.get(checkIn.participantId), now)) continue;

      const daysElapsed = Math.floor((now.getTime() - checkIn.createdAt.getTime()) / (1000 * 60 * 60 * 24));

      const participant = checkIn.participant;
      if (!participant) continue;

      const policy: ChasingPolicy = {
        days: checkIn.ground.chaseAfterDays,
        stopped: checkIn.ground.chasingStopped,
        tellTheLead: checkIn.ground.tellTheLead,
      };
      const decided = whatToDoToday({
        policy,
        daysOpen: daysElapsed,
        hoursSinceLastNudge: participant.lastNudgedAt
          ? (now.getTime() - participant.lastNudgedAt.getTime()) / (1000 * 60 * 60)
          : null,
        leadAlreadyTold: checkIn.leadToldAt !== null,
      });

      if (decided.do === 'tell the lead') {
        const lead = checkIn.ground.initiator;
        if (lead?.email) {
          /* Keyed by the GROUND, not the session. A ground with three sessions
             open sent the lead three emails in one morning, all about the same
             people — which is the chase this was supposed to end, addressed to
             the lead instead. */
          const key = checkIn.groundId;
          const entry = forTheLead.get(key) ?? {
            to: lead.email,
            leadName: lead.firstName ?? null,
            label: checkIn.ground.label,
            chasedOn: policy.days,
            who: [],
            checkInIds: [],
            organizationId: checkIn.ground.organizationId,
          };
          /* The name they are known by here, and their address only if that is all
             there is. A lead reading a list of email addresses cannot tell who is
             who any faster than they could before the email arrived. */
          const named = participant.user?.firstName ?? participant.email;
          if (!entry.who.includes(named)) entry.who.push(named);
          entry.checkInIds.push(checkIn.id);
          forTheLead.set(key, entry);
        }
        continue;
      }

      if (decided.do !== 'nudge them') continue;

      /* The person's own switch still wins over the lead's schedule. A lead can
         decide WHETHER this ground chases; they cannot decide that somebody who
         turned email off receives one. */
      if (participant.user?.emailNotifications === false) continue;
      /* And not to somebody who has left. The scheduled sweep runs for weeks after a round opens,
         which is exactly the window in which people leave. */
      if (participant.user && (!participant.user.isActive || participant.user.deletedAt)) {
        this.logger.log(`Not nudging participant ${participant.id}: their account has been deactivated.`);
        continue;
      }

      // #34: Check if the other party on the same ground + session has completed.
      const otherPartyCompleted = await this.prisma.checkIn.findFirst({
        where: {
          groundId: checkIn.groundId,
          sessionNumber: checkIn.sessionNumber,
          participantId: { not: checkIn.participantId },
          status: CheckInStatus.COMPLETED,
        },
        select: { id: true },
      }).then((r) => r !== null);

      const checkInUrl = this.email.buildCheckInUrl(checkIn.id);

      try {
        await this.email.sendNudge(
          participant.email,
          checkIn.ground.label,
          checkInUrl,
          undefined,
          otherPartyCompleted,
          /* Their own last open promise, to them only, on an anchor check-in (piece 30). */
          await theAnchorNudgeFor(this.prisma, { id: checkIn.groundId, startedFrom: (checkIn.ground as any).startedFrom }, participant.id),
          /* So the reminder carries its own way out. */
          participant.id,
          (checkIn.ground as any).simplerWords,
        );

        await this.prisma.groundParticipant.update({
          where: { id: participant.id },
          data: { lastNudgedAt: now },
        });

        this.logger.log(
          `Scheduled Day-${daysElapsed} nudge sent to participant ${participant.id} for check-in ${checkIn.id}`,
        );
      } catch (err: any) {
        this.logger.error(`Scheduled nudge failed for check-in ${checkIn.id}: ${err.message}`);
        continue;
      }

      /*
       * #72 — at or past the last chase day, check for three consecutive missed check-ins.
       *
       * This was `daysElapsed === 14`: one pass, on one hardcoded day, on a schedule the lead can
       * change. A ground chasing on [2, 5] never reached this at all, and a ground chasing on
       * [3, 7, 14] reached it only if the cron ran that morning. The guard below is what stops it
       * repeating — it looks at the reminders already sent — so the window can be open.
       */
      const lastChaseDay = policy.days.length ? Math.max(...policy.days) : 14;
      if (daysElapsed >= lastChaseDay) {
        try {
          await this.checkAndSendConsecutiveAbsenceReminder(
            checkInUrl,
            participant.id,
            participant.email,
            participant.user?.firstName ?? participant.email,
            checkIn.ground.label,
          );
        } catch (err: any) {
          this.logger.error(`Consecutive absence check failed for participant ${participant.id}: ${err.message}`);
        }
      }
    }

    /*
     * AND THEN THE LEAD HEARS, ONCE, BY NAME.
     *
     * Marked told only after the send succeeds — a failed email that stamped the
     * column would mean the lead never hears about those people at all, and
     * nothing would ever say so.
     */
    for (const [, entry] of forTheLead) {
      const composed = theEmailForTheLead({
        leadName: entry.leadName,
        groundLabel: entry.label,
        whoHasNotStarted: entry.who,
        chasedOn: entry.chasedOn,
        link: `${frontendUrl}/grounds`,
      });
      if (!composed) continue;

      try {
        await this.email.sendWhoHasNotStarted(entry.to, composed.subject, composed.text);
        await this.prisma.checkIn.updateMany({
          where: { id: { in: entry.checkInIds } },
          data: { leadToldAt: now },
        });

        /*
         * AND THE CHANNEL, IF THERE IS ONE.
         *
         * `what-a-channel-may-be-told.ts` defines four kinds of notice and exactly one of them was
         * ever sent, so an admin who connected Slack saw the test post and then near-silence for
         * weeks. This is the second: people have a check-in waiting. A COUNT and the check-in's own
         * label, never the names — the whole point of that file is that a channel is read by more
         * people than a check-in, and it is why `Notice` has nowhere to put a name.
         *
         * Outside the failure path on purpose: a lead is told by email whether or not a customer's
         * channel is reachable.
         */
        await this.workspace
          .tell(entry.organizationId, {
            what: 'a check-in is waiting',
            about: entry.label,
            howMany: entry.who.length,
            link: `${frontendUrl}/grounds`,
          })
          .catch((err) => this.logger.warn(`Workspace notice failed for "${entry.label}": ${err?.message}`));
      } catch (err: any) {
        this.logger.error(`Telling the lead about "${entry.label}" failed: ${err.message}`);
      }
    }
  }

  /**
   * #72 - Checks whether the given participant has 3 or more consecutive
   * NOT_STARTED check-ins whose period has ended (i.e. they were never started
   * and there is a newer check-in for the same ground or the ground has moved on).
   * A check-in is treated as "missed" if it is still NOT_STARTED and was created
   * more than 14 days ago (beyond the last scheduled nudge window).
   * If missedCount >= 3, sends a sendAbsenceReminder email.
   */
  private async checkAndSendConsecutiveAbsenceReminder(
    checkInUrl: string,
    participantId: string,
    email: string,
    name: string,
    groundName: string,
  ): Promise<void> {
    const MISSED_THRESHOLD_DAYS = 14;
    const cutoff = new Date(Date.now() - MISSED_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

    // Count NOT_STARTED check-ins for this participant that are past the nudge window.
    const allUnstarted = await this.prisma.checkIn.findMany({
      where: {
        participantId,
        status: CheckInStatus.NOT_STARTED,
        createdAt: { lt: cutoff },
      },
      orderBy: { sessionNumber: 'desc' },
      select: { id: true, sessionNumber: true, createdAt: true, availableFrom: true },
    });
    /* A check-in that opened while the person was on approved leave is not a missed one (week 23). */
    const who = await this.prisma.groundParticipant.findUnique({
      where: { id: participantId },
      select: { userId: true, ground: { select: { organizationId: true } } },
    });
    const theirLeave = who?.userId ? await theirApprovedLeave(this.prisma as any, who.userId, who.ground?.organizationId ?? null) : [];
    const missedCheckIns = allUnstarted.filter((c) => !fallsInLeave((c as any).availableFrom ?? c.createdAt, theirLeave) && !fallsInLeave(c.createdAt, theirLeave));

    // Walk back from the most recent session counting consecutive misses.
    let consecutiveMissed = 0;
    let prevSession: number | null = null;

    for (const ci of missedCheckIns) {
      if (prevSession === null || prevSession === ci.sessionNumber + 1) {
        consecutiveMissed++;
        prevSession = ci.sessionNumber;
      } else {
        // Gap in sessions - streak broken.
        break;
      }
    }

    if (consecutiveMissed >= 3) {
      /*
       * ONCE. The window this runs in is now open rather than one exact day, so without a record
       * of having sent it the same person would be told every morning that they have missed three
       * rounds — which is the chase this whole file exists to keep proportionate.
       *
       * Stamped only after the send succeeds: a failed email that stamped the column would mean
       * nobody is ever told, and nothing would say so.
       */
      const already = await this.prisma.groundParticipant.findUnique({
        where: { id: participantId },
        select: { absenceToldAt: true },
      });
      if (already?.absenceToldAt) return;

      await this.email.sendAbsenceReminder(email, name, groundName, consecutiveMissed, checkInUrl);
      await this.prisma.groundParticipant.update({
        where: { id: participantId },
        data: { absenceToldAt: new Date() },
      });
      this.logger.warn(
        `Absence reminder sent to participant ${participantId}: ${consecutiveMissed} consecutive missed check-in(s) on "${groundName}"`,
      );
    }
  }
}
