import { everyoneElseHasAnswered } from './the-last-one-we-are-waiting-for';
import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { onceAcrossCopies, theDay } from '../prisma/once-across-copies';
import { awayUntilOn, fallsInLeave, leaveOfThePeopleOn, theirApprovedLeave, whoOnACheckInIsAway } from '../suites/who-is-away';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CheckInStatus } from '@prisma/client';
import { A_GROUND_NO_MESSAGE_IS_ABOUT } from '../grounds/a-ground-that-has-ended';
import { isAWorkingDay } from '../grounds/which-days-this-team-works';
import { theNamesOfReadersCheckIns } from '../grounds/the-names-of-a-readers-check-ins';
import { worthNudging, whatToSendThem } from './who-is-worth-nudging';
import { nameToCall } from '../engagement/a-name-to-call-them';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { theEngagementMoment } from '../engagement/the-engagement-release-moment';
import { hasBeenToldOnce, nowToldOnce, isAlreadyHeld } from '../engagement/a-message-sent-once';
import { nobodyElseIsIn, theLeadsFirstWords } from '../engagement/the-leads-own-first-check-in';
import { theNudgeLineFor } from '../engagement/a-follow-up-from-their-own-record';
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
        user: { select: { firstName: true, emailNotifications: true, isActive: true, deletedAt: true, awaitingOrgApproval: true } },
        checkIns: {
          where: { sessionNumber: checkIn.sessionNumber },
          select: { id: true, status: true, createdAt: true },
        },
      },
    });

    /*
     * "Yours is the last one we are waiting for" is said to each person only when it is true of them: somebody else has finished and
     * nobody else who is still expected is left (the-last-one-we-are-waiting-for.ts). The person who pressed "remind" is one of the
     * people in the round, so they are read too.
     */
    const requesterRow = await this.prisma.groundParticipant.findFirst({
      where: { groundId: ground.id, userId: requestingUserId },
      select: { id: true, managingOnly: true, user: { select: { isActive: true, deletedAt: true, awaitingOrgApproval: true } }, checkIns: { where: { sessionNumber: checkIn.sessionNumber }, select: { status: true, createdAt: true } } },
    });
    const theWholeRound = [...allParticipants, ...(requesterRow ? [requesterRow as any] : [])];

    /*
     * NOT SIMPLY "NOT COMPLETED". See who-is-worth-nudging.ts — that test also said yes to
     * somebody who declined, to a managing-only lead who has no check-in by design, and to
     * anybody with no check-in for this session, whose reminder link was then built out of an
     * empty string and pointed at nothing.
     */
    const considered = allParticipants.map((p) => ({
      ...p,
      session: p.checkIns[0] ? { id: p.checkIns[0].id, status: p.checkIns[0].status as any, createdAt: (p.checkIns[0] as any).createdAt ?? null } : null,
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
      const theAnchorLine = await theNudgeLineFor(this.prisma, ground as any, (participant.session as any)?.createdAt, participant.id);
      await this.email.sendNudgeFromAPress(participant.email, specificThing, checkInUrl, undefined, everyoneElseHasAnswered(participant.id, theWholeRound as any), theAnchorLine, participant.id);

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
    /* Two check-ins of the same name are told apart in what each person reads. */
    const nameFor = theNamesOfReadersCheckIns(this.prisma);

    // Load all NOT_STARTED check-ins with participant and ground context.
    const notStarted = await this.prisma.checkIn.findMany({
      /* Never about a check-in that stalled, ended, is held or is waiting to be let in. */
      where: { status: CheckInStatus.NOT_STARTED, ground: { status: { notIn: A_GROUND_NO_MESSAGE_IS_ABOUT } } },
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
            initiatorId: true,
            createdAt: true,
            brief: true,
            chaseAfterDays: true,
            chasingStopped: true,
            tellTheLead: true,
            workingDays: true,
            initiator: { select: { email: true, firstName: true } },
          },
        },
        participant: {
          select: {
            id: true,
            email: true,
            userId: true,
            lastNudgedAt: true,
            nameGiven: true,
            user: { select: { firstName: true, lastName: true, emailNotifications: true, isActive: true, deletedAt: true } },
          },
        },
      },
    });

    /* Who the lead should hear about, gathered as we go and sent as ONE email per
       ground below. A mail per person is the same chase with the lead as its
       target. */
    const forTheLead = new Map<string, {
      to: string; leadName: string | null; label: string; chasedOn: number[];
      who: string[]; whoEmails: string[]; whoNudgedAt: (Date | null)[]; checkInIds: string[]; leadIsOpenToo: boolean;
      /* For the channel notice: `tell` is scoped to an organisation, not to a ground. */
      organizationId: string;
    }>();

    /* Approved leave, for every person in the sweep, in one read (week 23). */
    const leave = await leaveOfThePeopleOn(this.prisma as any, [...new Set(notStarted.map((c) => c.groundId))]);

    for (const checkIn of notStarted) {
      // Skip if not yet available.
      if (checkIn.availableFrom && checkIn.availableFrom > now) continue;
      /* A team that said which days it works is not chased on the others (B-020). A team that said nothing is chased as before. */
      if (!isAWorkingDay(now, (checkIn.ground as any).workingDays)) continue;
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
            label: await nameFor({ userId: (checkIn.ground as any).initiatorId, email: lead.email }, checkIn.groundId, checkIn.ground.label),
            chasedOn: policy.days,
            who: [],
            whoEmails: [],
            whoNudgedAt: [],
            leadIsOpenToo: false,
            checkInIds: [],
            organizationId: checkIn.ground.organizationId,
          };
          /* THE LEAD IS NEVER ONE OF THE PEOPLE THE LEAD IS TOLD HAVE NOT STARTED (decision 109 review). Her own open check-in is her own line below. */
          if (participant.userId && participant.userId === (checkIn.ground as any).initiatorId) {
            entry.leadIsOpenToo = true;
          } else {
            const named = nameToCall({ user: participant.user as any, nameGiven: (participant as any).nameGiven });
            if (!entry.whoEmails.includes(participant.email)) { entry.who.push(named); entry.whoEmails.push(participant.email); entry.whoNudgedAt.push(participant.lastNudgedAt ?? null); }
          }
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

      /* "Yours is the last one we are waiting for" only when it is true of this person (the-last-one-we-are-waiting-for.ts). */
      const theRound = await this.prisma.groundParticipant.findMany({
        where: { groundId: checkIn.groundId },
        select: { id: true, userId: true, managingOnly: true, user: { select: { isActive: true, deletedAt: true, awaitingOrgApproval: true } }, checkIns: { where: { sessionNumber: checkIn.sessionNumber }, select: { status: true, createdAt: true } } },
      });
      const otherPartyCompleted = everyoneElseHasAnswered(participant.id, theRound as any);

      const checkInUrl = this.email.buildCheckInUrl(checkIn.id);

      /* THE LEAD WHO MADE IT AND ADDED NOBODY is not chased as if somebody had invited her (decision 109, journey 1). */
      const isTheLead = !!participant.userId && participant.userId === (checkIn.ground as any).initiatorId;
      if (isTheLead && nobodyElseIsIn(theRound as any, participant.userId) && (await this.theLeadsFirstMessageIsFor((checkIn.ground as any).createdAt))) {
        const once = `lead-first:${checkIn.groundId}`;
        if (await hasBeenToldOnce(this.prisma, once) || await isAlreadyHeld(this.prisma, 'sendLeadFirstCheckIn', participant.email)) continue;
        try {
          const w = theLeadsFirstWords(participant.user?.firstName, checkIn.ground.label, (checkIn.ground as any).brief);
          const went = await this.email.sendLeadFirstCheckIn(participant.email, w.subject, w.lines, w.linkLabel, `${frontendUrl}/grounds/${checkIn.groundId}`, participant.id);
          await nowToldOnce(this.prisma, once, went, { sender: 'sendLeadFirstCheckIn', to: participant.email });
          if (went !== 'suppressed') await this.prisma.groundParticipant.update({ where: { id: participant.id }, data: { lastNudgedAt: now } });
        } catch (err: any) {
          this.logger.error(`The lead's first-check-in message failed for check-in ${checkIn.id}: ${err.message}`);
        }
        continue;
      }

      try {
        const theName = await nameFor({ userId: participant.userId, email: participant.email }, checkIn.groundId, checkIn.ground.label);
        const went = await this.email.sendNudge(
          participant.email,
          theName,
          checkInUrl,
          undefined,
          otherPartyCompleted,
          /* Their own last open promise, to them only, on an anchor check-in (piece 30). */
          await theNudgeLineFor(this.prisma, { id: checkIn.groundId, startedFrom: (checkIn.ground as any).startedFrom }, (checkIn as any).createdAt, participant.id),
          /* So the reminder carries its own way out. */
          participant.id,
          (checkIn.ground as any).simplerWords,
        );

        /* A reminder the one-a-day rule or the person's own choice refused did not go, so it does not use up their chase: it is tried again, and the
           lead is never told somebody was "reminded" when they were not (decision 109 review). */
        if ((went as unknown) === 'suppressed') continue;
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
            nameToCall(participant),
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
      /* WHAT WAS REALLY SENT, ABOUT THIS CHECK-IN TO THIS PERSON. The participant row is one person in one check-in, and its `lastNudgedAt` is set only
         when a reminder went (decision 109 review): the notification record has an address but no check-in, so it could say "reminded" about another one. */
      const remindedNames = entry.who.filter((_, i) => !!entry.whoNudgedAt[i]);
      const stamps = entry.whoNudgedAt.filter((d): d is Date => !!d).map((d) => new Date(d).getTime());
      const lastRemindedOn = stamps.length ? whenItWas(new Date(Math.max(...stamps)), 'day') : null;
      /* When she is the only one who has not started there is nothing to tell her about other people (decision 109 review). */
      if (entry.who.length === 0) continue;
      const composed = theEmailForTheLead({
        leadName: entry.leadName,
        groundLabel: entry.label,
        whoHasNotStarted: entry.who,
        chasedOn: entry.chasedOn,
        link: `${frontendUrl}/grounds`,
        remindedNames,
        lastRemindedOn,
        leadIsOpenToo: entry.leadIsOpenToo,
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

  /** Whether a check-in was made after the engagement messages began: an existing check-in keeps the chase it always had (decision 109 item 2). Unreadable means no. */
  private async theLeadsFirstMessageIsFor(madeAt: Date | null | undefined): Promise<boolean> {
    if (!madeAt) return false;
    try { return new Date(madeAt).getTime() >= (await theEngagementMoment(this.prisma)).getTime(); } catch { return false; }
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
