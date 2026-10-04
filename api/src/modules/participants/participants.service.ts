import { hashed } from '../auth/a-token-is-stored-as-its-hash';
import { sessionClaims } from '../auth/a-session-token';
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { isASecondOrganisation, GUEST_ROLE } from './joining-a-second-organisation';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { needsApproval, isAnAdminOf, whoToAsk, WAITING_TO_BE_LET_IN } from './nobody-joins-your-company-by-being-invited-to-a-check-in';

import { HELD_FOR_A_SEAT } from './held-for-a-seat';
export { HELD_FOR_A_SEAT };
import { tellTheAdminsSomebodyIsWaiting } from './somebody-is-waiting-at-the-door';
import { assertInviteLinkStillOpens, hasExpired } from './an-invite-link-still-opens';
import { whenItAsks } from './when-it-asks';
import { inviteExpiryFrom } from './how-long-an-invite-lasts';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AuthService } from '../auth/auth.service';
import { CheckInStatus, TokenType, Cadence, PartyType, GroundScenario } from '@prisma/client';
import { targetsFor } from '../board/whose-number-is-whose-business';
import { withoutWhatTheLeadHasNotToldThemAbout } from '../board/an-untold-goal-is-not-a-board-objective';
import { theFirstNameFrom } from '../reports/a-title-is-not-a-first-name';

/**
 * Participant magic-link entry. A participant is added to a ground by email and
 * notified immediately (never silently). They click the link, accept, and we
 * create or link a User for that email so they can own their private record.
 * The other party's account is never visible to them.
 */
/** The one reply "Send me a fresh link" ever gives. */
export const FRESH_LINK_REPLY =
  'If that is the address the invitation went to, a fresh link is on its way. Open it from your email.';

@Injectable()
export class ParticipantsService {
  private readonly logger = new Logger(ParticipantsService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private email: EmailService,
    private auth: AuthService,
  ) {}

  /** Preview an invite from its token - shown before the participant accepts. */
  async preview(token: string) {
    /*
     * AN EXPIRED INVITATION IS ANSWERED, NOT THROWN (U.3). The page it opens is "This link has
     * expired", which asks for the address and sends a fresh link. It needs the lead's FIRST name for
     * "If this isn't the address Wairimu invited, ask her to add the right one." and nothing else:
     * not the check-in, not the organisation, not the address it went to.
     */
    const row = await this.prisma.groundParticipant.findUnique({ where: { inviteToken: token } });
    if (row && hasExpired(row)) {
      const g = await this.prisma.ground.findUnique({ where: { id: row.groundId }, select: { initiator: { select: { firstName: true, lastName: true } } } });
      /* A title is never a first name: "Dr Amina Bello" is Amina (a-title-is-not-a-first-name.ts). */
      return { expired: true as const, leadFirstName: theFirstNameFrom(g?.initiator?.firstName, g?.initiator?.lastName) };
    }
    /*
     * HELD FOR A SEAT (U.4 third review): the page opens straight on the refusal, carrying nothing
     * else - not who invited them, not their part, not the check-in - because the admin's card says
     * "They have not been told any of this", and a button that is refused after it is pressed is not
     * an answer.
     */
    if (row?.awaitingSeat) return { heldForASeat: true as const, saying: HELD_FOR_A_SEAT };
    const participant = await this.loadByToken(token);
    const ground = await this.prisma.ground.findUnique({
      where: { id: participant.groundId },
      include: {
        initiator: { select: { firstName: true, lastName: true } },
        organization: { select: { name: true } },
        objectives: { select: { id: true, name: true, target: true, ownerParticipantId: true, isADecisionAboutAPerson: true } },
      },
    });
    if (!ground) throw new NotFoundException('Check-in not found');
    /* The person this link is for has not been told a goal the lead has set and not said: it is not a share of theirs to speak of (decisions 48 and 56). */
    const goalsNotToldYet: any[] = await ((this.prisma as any).personObjective?.findMany?.({
      where: { groundId: participant.groundId, participantId: participant.id, awareness: 'NOT_TOLD' },
      select: { id: true, participantId: true, text: true, awareness: true, authoredBy: true, createdAt: true },
    }) ?? Promise.resolve([])).catch(() => []);
    const leadFirst = theFirstNameFrom(ground.initiator.firstName, ground.initiator.lastName);

    /*
     * "YOUR NUMBER" (join-invite.txt: "Only you and Wairimu see your share of the target."), THROUGH
     * THE RULE THAT OWNS WHO SEES A SHARE (whose-number-is-whose-business.ts, board.service.ts's own
     * caller - the fix for ten people each seeing all ten targets). Nothing new is decided here about
     * visibility: `targetsFor` is asked for exactly what this one participant, not yet the lead, may
     * see, the same as the board asks it.
     *
     * THE VALUE NEVER LEAVES THIS FUNCTION (Hafsah's last check). This preview is read with the
     * link's token, before any sign-in - the one person who must not be handed a number here is the
     * one this token is for, over a channel that proves nothing about who is holding it yet. So this
     * sends only WHO would see it, never the number itself: `'you-and-lead'`, `'everybody'` (the
     * check-in's own `whoSeesTargets` setting), or `null` (no share of their own to speak of, or the
     * settled case - they have already joined, and the page does not show this block to them again).
     */
    const alreadyAccepted = !!participant.userId;
    const whoSeesTargets: 'their own' | 'everybody' = (ground as any).whoSeesTargets === 'EVERYBODY' ? 'everybody' : 'their own';
    const ownsAShare = !!withoutWhatTheLeadHasNotToldThemAbout(targetsFor(
      (ground as any).objectives ?? [],
      participant.id,
      whoSeesTargets,
      { isLead: false },
    ).shown as any[], goalsNotToldYet, [participant as any, { id: 'lead', user: ground.initiator } as any], false).kept.find((o: any) => o.ownerParticipantId === participant.id && o.target != null);
    const yourNumberIsSeenBy: 'you-and-lead' | 'everybody' | null =
      alreadyAccepted || !ownsAShare ? null : (whoSeesTargets === 'everybody' ? 'everybody' : 'you-and-lead');

    return {
      /* For "Wairimu invited you to the sales team's check-in" and "Baridi Appliances, until 30 September." */
      organisationName: (ground as any).organization?.name ?? null,
      leadFirstName: leadFirst,
      endsAt: ground.endsAt ? ground.endsAt.toISOString() : null,
      /* U.6 review: when their first check-in opens, if that is later than now, so the page does not
         offer "Answer today's check-in now" for a check-in that opens on 5 October. */
      opensOn: (() => {
        const at = (participant as any).startsAt ?? (ground as any).startsAt ?? null;
        return at && new Date(at).getTime() > Date.now() ? new Date(at).toISOString() : null;
      })(),
      /* "What it asks": the rhythm, in one sentence (when-it-asks.ts). */
      schedule: whenItAsks({
        cadence: ground.cadence,
        cadenceAnchorDay: ground.cadenceAnchorDay,
        workingDays: ground.workingDays,
        leadFirstName: leadFirst,
      }),
      groundLabel: ground.label,
      scenario: ground.scenario,
      initiatorName: `${ground.initiator.firstName} ${ground.initiator.lastName}`.trim(),
      /* U.6 review: no "Your part in this". What is stored there is the lead's sentence about this
         person (the-leads-words-about-someone.ts), and this page is read by that person. */
      email: participant.email,
      alreadyAccepted,
      /* Somebody who answered through an open link has no sign-in yet, and has already done the thing
         the arrival screen describes. A link that brings them to their report should not read "wants
         to hear your version" - see InvitePage, which goes straight through on this. */
      hasAnswered: await this.prisma.checkIn.count({ where: { participantId: participant.id, status: CheckInStatus.COMPLETED } }).then((n) => n > 0).catch(() => false),
      nameGiven: (participant as any).nameGiven ?? null,
      yourNumberIsSeenBy,
    };
  }

  /**
   * Accept the invite: create or link a User for this email, attach it to the
   * participant, clear the token, and return an auth token + the check-in to
   * enter. Idempotent if already accepted (re-issues a token + the check-in).
   */
  async accept(token: string, names?: { firstName?: string; lastName?: string }, returningUserId?: string | null) {
    const participant = await this.loadByToken(token);
    const ground = await this.prisma.ground.findUnique({ where: { id: participant.groundId } });
    if (!ground) throw new NotFoundException('Check-in not found');
    /*
     * HELD FOR A SEAT (U.4 re-review): not offered the check-in until a seat is freed and the
     * invitation is sent, even with the link in hand (the lead can copy it). Nothing is created.
     */
    if (participant.awaitingSeat) throw new BadRequestException(HELD_FOR_A_SEAT);

    // AN INVITE LINK IS SINGLE USE FOR SIGNING IN.
    //
    // It used to mint a fresh access token every time it was presented, and the
    // token was never cleared, so the emailed link stayed a permanent bearer
    // credential for that person's account: anyone who ever saw it - a forwarded
    // email, a screenshot, a shared inbox, an old archive - could sign in as
    // them and read their private account, indefinitely.
    //
    // On first accept everyone is sent a password-setup link precisely so they
    // can return properly, so nothing is lost by refusing the second use.
    /**
     * ALREADY JOINED: RESUMABLE HERE, EMAIL ROUND TRIP ANYWHERE ELSE.
     *
     * The link used to be destroyed on first use, so someone who joined, got
     * pulled away, and came back to their own email found a dead link telling
     * them it was "invalid". That is a bad trade for a product people use in the
     * middle of a working day - they should be able to click, get distracted,
     * and come back.
     *
     * But the link mints a signed session, so a link that always works is a
     * password that anyone forwarded the email can use - and what it opens is
     * the participant's private account of a workplace situation, on a ground
     * their manager is also in. That is the most sensitive thing here, and the
     * person most likely to receive a forwarded participant invite is the
     * manager.
     *
     * So the link now lives forever and what changes is what clicking it DOES:
     *
     *   never joined          -> join, account created, signed in
     *   joined, this browser  -> straight back in, for as long as their session
     *                            lasts (30 days, set below)
     *   joined, anywhere else -> no session minted. A fresh sign-in link is sent
     *                            to the address that was invited.
     *
     * Nobody meets a dead end, nobody is told their link is invalid, and a
     * forwarded link is worth nothing to anyone but the owner of that inbox.
     *
     * "This browser" is their own session, already in this browser's storage
     * from when they joined - not a new cookie layer. Presenting it is the proof.
     */
    if (participant.userId) {
      if (returningUserId && returningUserId === participant.userId) {
        const checkIn = await this.prisma.checkIn.findFirst({
          where: { participantId: participant.id, status: { not: CheckInStatus.COMPLETED } },
          orderBy: { sessionNumber: 'asc' },
        });
        /* STILL WAITING TO BE LET IN (U.3): coming back on the same browser must land on "Almost in",
           never on a check-in that will refuse them. */
        const waitingStill = await this.prisma.user.findUnique({ where: { id: participant.userId }, select: { awaitingOrgApproval: true } });
        if (waitingStill?.awaitingOrgApproval) {
          return { resumed: true as const, groundId: participant.groundId, checkInId: null, queuedForApproval: true, saying: WAITING_TO_BE_LET_IN };
        }
        return { resumed: true as const, groundId: participant.groundId, checkInId: checkIn?.id ?? null };
      }

      // A different browser. Send them a way in rather than a refusal.
      const user = await this.prisma.user.findUnique({ where: { id: participant.userId } });
      /* Which check-in the link they clicked was for, so the mail can bring them back to it. */
      const theirOpenCheckIn = await this.prisma.checkIn.findFirst({
        where: { participantId: participant.id, status: { not: CheckInStatus.COMPLETED } },
        orderBy: { sessionNumber: 'asc' },
        select: { id: true },
      });
      /*
       * "GET UPDATES FROM YOUR TEAM" PROMISES NO SIGN-UP AND NO SIGN-IN. Hafsah, 21 Sep 2026: "this
       * is not meant to require people to login. This only works if you are logged in." The one-line
       * link went to her inbox, she opened it in a browser holding no session, and the page spun on
       * "Opening your question" for ever. The link in the inbox IS the credential this flow was
       * designed around - the same trust as the magic link this branch would have emailed instead.
       * So for a situation that opens straight on the question, the link signs its own recipient in
       * again and opens the question. Every other situation keeps the emailed way in.
       */
      if (user && ground.scenario === GroundScenario.TEAM_UPDATES && theirOpenCheckIn) {
        const accessToken = this.jwt.sign(sessionClaims(user, 'link'));
        return {
          accessToken,
          user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
          groundId: participant.groundId,
          checkInId: theirOpenCheckIn.id,
          existingAccount: true as const,
        };
      }
      if (user) {
        const magicToken = crypto.randomBytes(32).toString('hex');
        await this.prisma.emailVerificationToken.create({
          data: {
            userId: user.id,
            token: hashed(magicToken),
            // Same kind of token the returning-user sign-in link uses, so this
            // lands on the existing magic-link route rather than a new one.
            type: TokenType.EMAIL_VERIFICATION,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
        /* WITH SOMEWHERE TO GO. This is the returning-user branch of an invite: they clicked a link
           to ONE check-in from a browser that holds no session, so the mail that brings them back
           has to bring them back HERE. Without it they sign in and land on a list of everything. */
        this.email
          .sendMagicLinkEmail(
            user.email,
            user.firstName || '',
            magicToken,
            theirOpenCheckIn ? `/checkin/${theirOpenCheckIn.id}` : `/grounds/${participant.groundId}/p`,
          )
          .catch(() => null);
      }
      return { emailed: true as const, email: participant.email };
    }

    const email = participant.email.toLowerCase();
    /* The name they gave at the end of an open link is the name their sign-in gets, where the arrival form asked for none. */
    const given = ((participant as any).nameGiven ?? '').trim();
    const [firstName, lastName] = this.resolveName(email, names?.firstName ? names : given ? { firstName: given.split(/\s+/)[0], lastName: given.split(/\s+/).slice(1).join(' ') } : names);

    let existingAccount = false;
    /* Set inside the transaction, read after it, so the caller can tell somebody they are waiting
       rather than dropping them on a check-in that will refuse them. */
    let queuedForApproval = false;
    const user = await this.prisma.$transaction(async (tx) => {
      // Reuse an existing account for this email, else create one in the
      // ground's organization. Email is globally unique.
      let user = await tx.user.findUnique({ where: { email } });
      const brandNew = !user;
      /*
       * WHETHER THIS PERSON IS JOINING AN ORGANISATION, AND WHETHER ANYBODY SAID THEY COULD.
       *
       * Worked out BEFORE the account is created, because once it exists its own organisationId
       * answers "is this their org?" with yes and the question can no longer be asked. That is
       * exactly how this went unnoticed: by the time anything looked, the person was a member.
       */
      const alreadyAMemberHere = user
        ? user.organizationId === ground.organizationId ||
          (await tx.organizationMembership.findUnique({
            where: { userId_organizationId: { userId: user.id, organizationId: ground.organizationId } },
            select: { id: true },
          })) !== null
        : false;
      /* Whoever added THIS person - the lead, or the admin who set the check-in up for them (U.4). */
      const inviter = await tx.user.findUnique({
        where: { id: whoToAsk(participant.addedByUserId, ground.initiatorId) },
        select: { role: true, organizationId: true },
      });
      const wait = needsApproval({
        groundOrganizationId: ground.organizationId,
        theirHomeOrganizationId: user?.organizationId ?? null,
        alreadyAMemberHere,
        /* An admin of this organisation adding somebody IS the approval - asking them to approve
           their own action is a queue with one item in it that they put there. */
        addedByAnAdminOfThisOrg: isAnAdminOf(ground.organizationId, inviter),
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            organizationId: ground.organizationId,
            email,
            firstName,
            lastName,
            role: 'MEMBER',
            isEmailVerified: true, // they arrived via an emailed link
            passwordHash: null,
            /* Holds no seat and cannot check in until somebody says yes. */
            awaitingOrgApproval: wait,
          },
        });
      } else {
        // Pre-existing account - let the client know so it can surface a message.
        existingAccount = true;
      }
      /*
       * Cross-org participation: user keeps their home org. The JWT carries their real orgId so
       * their own grounds remain accessible.
       *
       * AND A MEMBERSHIP FOR THE ORGANISATION THEY HAVE JUST JOINED, which nothing wrote before.
       * The middleware that mints memberships fires on `User.create` and so only ever records the
       * first one - leaving somebody in two companies with one membership, invisible to the
       * switcher, and reading as their home-org role everywhere. See
       * joining-a-second-organisation.ts.
       *
       * ALWAYS MEMBER. Being an admin of your own company says nothing about what you should be
       * able to do in somebody else's.
       */
      if (isASecondOrganisation(user.organizationId, ground.organizationId)) {
        await tx.organizationMembership.upsert({
          where: { userId_organizationId: { userId: user.id, organizationId: ground.organizationId } },
          create: { userId: user.id, organizationId: ground.organizationId, role: GUEST_ROLE },
          /* Nothing on a second acceptance: a role somebody was given there is theirs to keep. */
          update: {},
        });
      }

      /*
       * THE QUEUE. One row per (organisation, person), so a second invitation to the same company
       * joins the request that is already waiting rather than making another one.
       */
      if (wait) {
        queuedForApproval = true;
        /* Nobody with an existing account waits any more (see needsApproval), so the flag is only ever
           set on the row created above - never on an account that has check-ins elsewhere to be locked
           out of. `brandNew` is kept as the assertion of that. */
        if (!brandNew) {
          this.logger.error(`needsApproval said existing account ${user.id} should wait; refusing to flag it, because the flag is account-wide and would lock them out of their own organisation.`);
        }
        await tx.membershipRequest.upsert({
          where: { organizationId_userId: { organizationId: ground.organizationId, userId: user.id } },
          create: {
            organizationId: ground.organizationId,
            userId: user.id,
            email,
            requestedByUserId: ground.initiatorId,
            groundId: ground.id,
            /* A real invitation, so their "Almost in" page may name the admin asked (U.3). */
            viaInvitation: true,
          },
          /* A request already decided is not reopened by another invitation, and a pending one is
             left exactly as it is - the admin is looking at a list, not a moving target. */
          update: {},
        });
      }

      await tx.groundParticipant.update({
        where: { id: participant.id },
        /**
         * The token STAYS. It is no longer a credential on its own - an accepted
         * invite mints nothing without the participant's own session in the same
         * browser (see the branch above) - and keeping it is what lets their own
         * link go on working instead of dying the moment they first use it.
         */
        data: { userId: user.id },
      });

      return user;
    });

    /*
     * AND TELL THE PEOPLE WHO CAN ANSWER IT.
     *
     * After the transaction and never inside it: a mail provider being slow must not roll back
     * somebody's acceptance, and a mail failing must not either. Swallowed for the same reason -
     * the queue is visible on the People page whether or not this arrives.
     */
    if (queuedForApproval) {
      this.tellTheAdminsSomebodyIsWaiting(ground.organizationId, ground.id, ground.initiatorId, email)
        .catch((err: any) => this.logger.warn(`Could not tell the admins about ${email}: ${err.message}`));
    }

    // Send a password setup link so the participant can return after their
    // initial session without being locked out. Only send when no password
    // is set - existing accounts that already have one don't need this.
    if (!user.passwordHash) {
      const setupToken = crypto.randomBytes(32).toString('hex');
      await this.prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          token: hashed(setupToken),
          type: TokenType.PASSWORD_SETUP,
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
        },
      });
      this.email.sendAddPasswordEmail(user.email, user.firstName, setupToken).catch(() => null);
    }

    // SEQUENTIAL cadence: if this participant was added before the lead
    // completed their own session 1 (so their session 1 was locked at
    // creation - see GroundsService.addParticipant()/createForLead()), and
    // the lead has since completed it, the lock should already be satisfied -
    // clear it now rather than leaving them stuck until some other trigger
    // happens to touch this row. Without this, accepting after the lead has
    // already gone first would leave a participant locked out indefinitely.
    if (ground.cadence === Cadence.SEQUENTIAL) {
      const leadCompletedSession1 = await this.prisma.checkIn.findFirst({
        where: { groundId: ground.id, participant: { partyType: PartyType.INITIATOR }, sessionNumber: 1, status: CheckInStatus.COMPLETED },
      });
      if (leadCompletedSession1) {
        await this.prisma.checkIn.updateMany({
          where: { participantId: participant.id, status: CheckInStatus.NOT_STARTED, availableFrom: { gt: new Date() } },
          data: { availableFrom: new Date() },
        });
      }
    }

    /**
     * THE PARTICIPANT'S FIRST SESSION TO ENTER, AND THERE IS ALWAYS ONE.
     *
     * Every path that adds a participant creates their session-1 row alongside them, so this
     * lookup normally finds it. But `checkInId: null` was allowed to fall through, and the
     * client's only answer to null is to drop them on the ground page - where accepting an
     * invitation ends at ANOTHER button, "Check in for session 1 of 2". Someone who has just
     * clicked a link in their email, read the briefing, and pressed "Add my version" is then
     * asked to press a third thing to start the one task they came for.
     *
     * Rather than teach the client to handle a hole, close the hole. If a person has accepted
     * an invitation and has no open session, that state is not a decision anybody made - it is
     * a row that failed to get written, and the honest repair is to write it. This is the same
     * rule the entry-flow join already applies (entry.service join-accept), so the two ways in
     * now behave identically instead of one of them quietly being worse.
     *
     * The lookup stays first, so a person who already has a session NEVER gets a second one.
     */
    let checkIn = await this.prisma.checkIn.findFirst({
      where: { participantId: participant.id, status: { in: [CheckInStatus.NOT_STARTED, CheckInStatus.IN_PROGRESS] } },
      orderBy: { sessionNumber: 'asc' },
    });
    if (!checkIn) {
      /**
       * Only when they have never completed one either. Somebody at the end of a finished
       * ground has no open session BECAUSE they are done, and minting them a fresh session 1
       * would reopen a closed account and corrupt the record.
       */
      const everCompleted = await this.prisma.checkIn.findFirst({
        where: { participantId: participant.id, status: CheckInStatus.COMPLETED },
        select: { id: true },
      });
      if (!everCompleted) {
        this.logger.warn(`accept: participant ${participant.id} had no session-1 check-in on ground ${ground.id}; creating one`);
        checkIn = await this.prisma.checkIn.create({
          data: { groundId: ground.id, participantId: participant.id, sessionNumber: 1, status: CheckInStatus.NOT_STARTED },
        });
      }
    }

    /* The same claims every session token carries - see a-session-token.ts for why not a hand-copied payload. */
    const accessToken = this.jwt.sign(sessionClaims(user, 'link'));

    return {
      accessToken,
      /**
       * THE SAME SHAPE EVERY OTHER SIGN-IN DOOR SENDS (U.8 re-review), including `organizationName` -
       * this used to be a hand-built subset (id, email, name, role, organizationId only), so the
       * organisation switcher had nothing to show until the app-wide `/auth/me` safety net's request
       * landed. `userShapeFor` is the one builder `/auth/me` itself uses.
       */
      user: await this.auth.userShapeFor(user.id),
      groundId: ground.id,
      checkInId: checkIn?.id ?? null,
      existingAccount,
      /* Signed in, and not yet let in. The page that receives this renders the sentence rather than
         sending them to a check-in that will refuse them with a message about something else. */
      queuedForApproval,
      ...(queuedForApproval ? { saying: WAITING_TO_BE_LET_IN } : {}),
    };
  }


  /**
   * Update a participant's role. Only the participant themselves or the ground initiator (the lead)
   * may call this.
   *
   * NEVER THE PERSON'S OWN WORDS INTO roleAsDescribed (decision 30; `aRoleInTheirOwnWords`;
   * tightened 30 September 2026). That column is the LEAD's private description of somebody, read
   * only by the lead and never by the person it is about or a colleague (`theLeadsWordsAbout`,
   * `a75b13ac`, `7586775d`). The one exception is a lead's own INITIATOR row, which is already their
   * own words about themselves (the remit they gave when creating the ground -
   * `grounds.service.ts`'s `leadRemit`), and `aRoleInTheirOwnWords` already trusts exactly that row.
   * Anywhere else, a caller editing their OWN row is not the lead describing them - it is the person
   * giving their own statement of their role, and that goes where the person's own role is kept:
   * their account's `jobTitle` (`User.jobTitle`), the same field Setup already reads to greet a
   * returning lead by "what they do" and the field only ever written through the person's own
   * profile (`PATCH /auth/profile`) - never by anybody else. A lead editing somebody ELSE's row is
   * unchanged: that write is exactly what `roleAsDescribed` is for.
   *
   * DECISION 57, ITEM 5: giving a role, in either of their own words, is itself how a person or their
   * lead confirms or corrects the guessed function - so this also stamps
   * detectedFunctionConfirmedAt/By, the same as the plain confirm-as-is route below. Once stamped, a
   * guess below the confirmation threshold may be used (see function-detection.ts,
   * needsRoleConfirmation); until then only the role-agnostic universal floor applies.
   */
  async updateRole(participantId: string, userId: string, roleAsDescribed: string) {
    const participant = await this.prisma.groundParticipant.findUnique({
      where: { id: participantId },
      include: { ground: { include: { participants: { where: { partyType: 'INITIATOR' } } } } },
    });
    if (!participant) throw new NotFoundException('Participant not found');

    const isOwner = participant.userId === userId;
    const isInitiator = participant.ground.participants.some((p) => p.userId === userId);
    if (!isOwner && !isInitiator) throw new NotFoundException('Participant not found');

    const now = new Date();

    /* The person, giving their own statement of their own role - never the lead's private
       description, whether or not they also happen to lead some other check-in. */
    if (isOwner && participant.partyType !== 'INITIATOR') {
      await Promise.all([
        this.prisma.user.update({ where: { id: userId }, data: { jobTitle: roleAsDescribed } }),
        this.prisma.groundParticipant.update({
          where: { id: participantId },
          data: { detectedFunctionConfirmedAt: now, detectedFunctionConfirmedBy: userId },
        }),
      ]);
      return { id: participantId, ownRoleAsGiven: roleAsDescribed };
    }

    /* The lead: describing somebody else (roleAsDescribed, private to the lead), or their own
       INITIATOR row, which `aRoleInTheirOwnWords` already reads as their own words about themselves. */
    const updated = await this.prisma.groundParticipant.update({
      where: { id: participantId },
      data: { roleAsDescribed, detectedFunctionConfirmedAt: now, detectedFunctionConfirmedBy: userId },
    });
    return { id: updated.id, roleAsDescribed: updated.roleAsDescribed };
  }

  /**
   * "IS THAT RIGHT?" ANSWERED "YES" (decision 57, item 5): confirms the guessed function as it
   * stands, with no change to roleAsDescribed - the plain-words companion to updateRole above, for
   * when nothing needs correcting. Same permission: the participant themselves, or the ground
   * initiator (the lead), confirming for them from the Context page.
   */
  async confirmDetectedFunction(participantId: string, userId: string) {
    const participant = await this.prisma.groundParticipant.findUnique({
      where: { id: participantId },
      include: { ground: { include: { participants: { where: { partyType: 'INITIATOR' } } } } },
    });
    if (!participant) throw new NotFoundException('Participant not found');

    const isOwner = participant.userId === userId;
    const isInitiator = participant.ground.participants.some((p) => p.userId === userId);
    if (!isOwner && !isInitiator) throw new NotFoundException('Participant not found');

    const updated = await this.prisma.groundParticipant.update({
      where: { id: participantId },
      data: { detectedFunctionConfirmedAt: new Date(), detectedFunctionConfirmedBy: userId },
    });
    return {
      id: updated.id,
      detectedFunction: updated.detectedFunction,
      detectedFunctionConfirmedAt: updated.detectedFunctionConfirmedAt,
    };
  }

  /** Fix a bounced/wrong address and resend the invite - initiator only, and
   * ONLY while the participant has never accepted (userId null). Rewriting an
   * accepted participant's address would be an account-hijack vector: their
   * link and record would silently point at a new inbox. */
  /**
   * MY ROW, MY ADDRESS. See the controller. The participant row's email is where the report and the
   * reminders go, so that changes. The sign-in made by the invite link carries the same address, and
   * changes with it only when it still matches - somebody who joined with a sign-in of their own keeps
   * it, because that address is theirs already and nothing here should touch it.
   */
  async updateMyEmail(actingUserId: string, groundId: string, newEmail: string) {
    const email = newEmail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new BadRequestException('That is not an email address.');
    const mine = await this.prisma.groundParticipant.findFirst({
      where: { groundId, userId: actingUserId },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!mine) throw new NotFoundException('You are not on this check-in.');
    if (mine.email.toLowerCase() === email) return { email, changed: false };
    const takenHere = await this.prisma.groundParticipant.findFirst({ where: { groundId, email, id: { not: mine.id } }, select: { id: true } });
    if (takenHere) throw new BadRequestException('Somebody on this check-in already has that address.');
    const linkMadeThisSignIn = !!mine.user && mine.user.email.toLowerCase() === mine.email.toLowerCase();
    if (linkMadeThisSignIn) {
      const otherUser = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (otherUser && otherUser.id !== actingUserId) {
        throw new BadRequestException('That address already has a sign-in. Sign in with it, then open your link again.');
      }
    }
    await this.prisma.$transaction([
      this.prisma.groundParticipant.update({ where: { id: mine.id }, data: { email } }),
      ...(linkMadeThisSignIn ? [this.prisma.user.update({ where: { id: actingUserId }, data: { email, isEmailVerified: false } })] : []),
    ]);
    return { email, changed: true, signInMoved: linkMadeThisSignIn };
  }

  async updateEmail(participantId: string, actingUserId: string, newEmail: string) {
    const participant = await this.prisma.groundParticipant.findUnique({
      where: { id: participantId },
      include: { ground: { include: { participants: { where: { partyType: 'INITIATOR' } } } } },
    });
    if (!participant) throw new NotFoundException('Participant not found');

    const isInitiator = participant.ground.participants.some((p) => p.userId === actingUserId);
    if (!isInitiator) throw new NotFoundException('Participant not found');
    if (participant.userId) {
      throw new BadRequestException('This person has already joined - their email cannot be changed. Remove and re-invite them instead.');
    }

    const email = newEmail.trim().toLowerCase();
    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.groundParticipant.update({
      where: { id: participantId },
      data: {
        email,
        inviteToken: token,
        inviteTokenExpiresAt: inviteExpiryFrom(),
        notifiedAt: null,
        // recordSend() resets this to SENT when the fresh invite goes out
        inviteDeliveryStatus: null,
      },
    });

    const initiator = await this.prisma.user.findUnique({ where: { id: participant.ground.initiatorId } });
    await this.email.sendParticipantInvite(
      email,
      `${initiator?.firstName ?? 'A founder'}`,
      participant.ground.label,
      token,
      undefined,
      { kind: 'PARTICIPANT_INVITE', participantId, groundId: participant.groundId },
    );
    await this.prisma.groundParticipant.update({ where: { id: participantId }, data: { notifiedAt: new Date() } });
    return { id: participantId, email };
  }

  // --- helpers ---

  /** The rule lives in an-invite-link-still-opens.ts, because attaching a document before the account exists presents the same token. */
  /**
   * "SEND ME A FRESH LINK" (U.3, #/join/expired).
   *
   * The same reply whatever happened, so the form cannot be used to learn whether an address was
   * invited, or to whom: "We don't show who invited an address we don't recognise." A link goes out
   * only when the token is a real invitation nobody has accepted and the address typed is the one it
   * was sent to. The token is kept (every email already sent keeps working) and only its expiry is
   * renewed, exactly as the lead's own "send it again" does.
   */
  async sendAFreshLink(token: string, typedEmail: string): Promise<{ says: string }> {
    const says = FRESH_LINK_REPLY;
    const email = (typedEmail ?? '').trim().toLowerCase();
    if (!token || !email) return { says };
    const participant = await this.prisma.groundParticipant.findUnique({ where: { inviteToken: token } });
    if (!participant || participant.userId || (participant.email ?? '').toLowerCase() !== email) return { says };
    const ground = await this.prisma.ground.findUnique({
      where: { id: participant.groundId },
      include: { initiator: { select: { firstName: true } } },
    });
    if (!ground) return { says };
    await this.prisma.groundParticipant.update({
      where: { id: participant.id },
      data: { inviteTokenExpiresAt: inviteExpiryFrom(), inviteExpiryWarnedAt: null, inviteLapsedToldAt: null },
    });
    try {
      await this.email.sendTheInviteThisGroundSends(
        ground,
        participant.email,
        `${ground.initiator?.firstName ?? 'A founder'}`,
        token,
        undefined,
        { kind: 'PARTICIPANT_INVITE', participantId: participant.id, groundId: ground.id },
      );
    } catch (err: any) {
      /* Still the same reply: a slow mail provider must not turn this into a way of telling addresses apart. */
      this.logger.warn(`Fresh invitation link to ${participant.email} did not send: ${err?.message}`);
    }
    return { says };
  }

  private async loadByToken(token: string) {
    const participant = await this.prisma.groundParticipant.findUnique({ where: { inviteToken: token } });
    return assertInviteLinkStillOpens(participant);
  }

  // Never fabricate a name from the email address. firstName is a required
  // column, but an empty string is the correct "no name given" value -
  // every name-display surface already treats an empty name as absent and
  // falls back to "a colleague". Never to roleAsDescribed: that is the lead's
  // own description of the person, and it can hold the lead's private words
  // (request 36, 27 September 2026).
  // A capitalized email local-part ("Hjumare") is not a name; it just looks
  // like one, which is worse than showing nothing.
  /** Every admin of the organisation, because one of them has to decide and any of them may. */
  /** The sentence lives in somebody-is-waiting-at-the-door.ts now, because the join link queues people too. */
  private tellTheAdminsSomebodyIsWaiting(organizationId: string, groundId: string, inviterId: string, who: string): Promise<void> {
    return tellTheAdminsSomebodyIsWaiting({ prisma: this.prisma, email: this.email, logger: this.logger }, organizationId, groundId, inviterId, who);
  }

  private resolveName(email: string, names?: { firstName?: string; lastName?: string }): [string, string] {
    if (names?.firstName) return [names.firstName, names.lastName ?? ''];
    return ['', ''];
  }
}
