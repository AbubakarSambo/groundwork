import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { isASecondOrganisation, GUEST_ROLE } from './joining-a-second-organisation';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { needsApproval } from './nobody-joins-your-company-by-being-invited-to-a-check-in';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CheckInStatus, TokenType, Cadence, PartyType } from '@prisma/client';

/**
 * Participant magic-link entry. A participant is added to a ground by email and
 * notified immediately (never silently). They click the link, accept, and we
 * create or link a User for that email so they can own their private record.
 * The other party's account is never visible to them.
 */
@Injectable()
export class ParticipantsService {
  private readonly logger = new Logger(ParticipantsService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private email: EmailService,
  ) {}

  /** Preview an invite from its token - shown before the participant accepts. */
  async preview(token: string) {
    const participant = await this.loadByToken(token);
    const ground = await this.prisma.ground.findUnique({
      where: { id: participant.groundId },
      include: { initiator: { select: { firstName: true, lastName: true } } },
    });
    if (!ground) throw new NotFoundException('Check-in not found');

    return {
      groundLabel: ground.label,
      scenario: ground.scenario,
      initiatorName: `${ground.initiator.firstName} ${ground.initiator.lastName}`.trim(),
      roleAsDescribed: participant.roleAsDescribed,
      email: participant.email,
      alreadyAccepted: !!participant.userId,
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
        return { resumed: true as const, groundId: participant.groundId, checkInId: checkIn?.id ?? null };
      }

      // A different browser. Send them a way in rather than a refusal.
      const user = await this.prisma.user.findUnique({ where: { id: participant.userId } });
      if (user) {
        const magicToken = crypto.randomBytes(32).toString('hex');
        await this.prisma.emailVerificationToken.create({
          data: {
            userId: user.id,
            token: magicToken,
            // Same kind of token the returning-user sign-in link uses, so this
            // lands on the existing magic-link route rather than a new one.
            type: TokenType.EMAIL_VERIFICATION,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
        this.email.sendMagicLinkEmail(user.email, user.firstName || '', magicToken).catch(() => null);
      }
      return { emailed: true as const, email: participant.email };
    }

    const email = participant.email.toLowerCase();
    const [firstName, lastName] = this.resolveName(email, names);

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
      const inviter = await tx.user.findUnique({
        where: { id: ground.initiatorId },
        select: { role: true, organizationId: true },
      });
      const wait = needsApproval({
        groundOrganizationId: ground.organizationId,
        theirHomeOrganizationId: user?.organizationId ?? null,
        alreadyAMemberHere,
        /* An admin of this organisation adding somebody IS the approval - asking them to approve
           their own action is a queue with one item in it that they put there. */
        addedByAnAdminOfThisOrg:
          inviter?.role === 'ADMIN' && inviter?.organizationId === ground.organizationId,
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
        if (!brandNew) {
          await tx.user.update({ where: { id: user.id }, data: { awaitingOrgApproval: true } });
        }
        await tx.membershipRequest.upsert({
          where: { organizationId_userId: { organizationId: ground.organizationId, userId: user.id } },
          create: {
            organizationId: ground.organizationId,
            userId: user.id,
            email,
            requestedByUserId: ground.initiatorId,
            groundId: ground.id,
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
          token: setupToken,
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

    const accessToken = this.jwt.sign({ sub: user.id, email: user.email, organizationId: user.organizationId, role: user.role });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
      },
      groundId: ground.id,
      checkInId: checkIn?.id ?? null,
      existingAccount,
    };
  }


  /** Update a participant's roleAsDescribed. Only the participant themselves or the ground initiator may call this. */
  async updateRole(participantId: string, userId: string, roleAsDescribed: string) {
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
      data: { roleAsDescribed },
    });
    return { id: updated.id, roleAsDescribed: updated.roleAsDescribed };
  }

  /** Fix a bounced/wrong address and resend the invite - initiator only, and
   * ONLY while the participant has never accepted (userId null). Rewriting an
   * accepted participant's address would be an account-hijack vector: their
   * link and record would silently point at a new inbox. */
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
        inviteTokenExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
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

  private async loadByToken(token: string) {
    const participant = await this.prisma.groundParticipant.findUnique({ where: { inviteToken: token } });
    if (!participant) {
      /**
       * The link is genuinely dead, and that is deliberate - the token is
       * cleared on first use so an emailed invite cannot serve as a permanent
       * way in (see invite-single-use.spec.ts). Nothing here should hand a used
       * link any access.
       *
       * What was wrong was only the wording. Someone who has already joined and
       * comes back to their own link - a bookmark, the email again - was told
       * their link was "invalid", which reads as something being broken, or as
       * an accusation. It is neither: they are already in, and they were sent a
       * password link when they joined.
       *
       * We cannot tell "used" from "never existed" here, because the row is
       * found by the token and the token is gone - so the message has to cover
       * both without guessing, and point to the way forward in each case.
       */
      throw new NotFoundException(
        'This link has already been used, or it is not a link we recognise. If you have already joined, sign in with the password you set - check your email for the setup link. If you have not, ask the person who added you to send a new invite.',
      );
    }
    // Skip expiry for participants who already accepted - they can always return via their link.
    const alreadyAccepted = !!participant.userId;
    /**
     * Ninety days, and only for an invite nobody ever accepted.
     *
     * Fourteen days was short enough to expire on ordinary human timescales -
     * annual leave, a quarter that slipped, a ground set up ahead of a start
     * date - and the reward for being late was a dead link and an instruction to
     * go and ask a colleague to resend it. Nobody should have to chase someone
     * to get into their own record.
     */
    if (!alreadyAccepted && participant.inviteTokenExpiresAt && participant.inviteTokenExpiresAt < new Date()) {
      throw new BadRequestException(
        'This invite link is very old and has expired. Use the "send me a new link" option, or ask whoever added you to invite you again.',
      );
    }
    return participant;
  }

  // Never fabricate a name from the email address. firstName is a required
  // column, but an empty string is the correct "no name given" value -
  // participantLabel() (and every other name-display surface) already treats
  // an empty name as absent and falls back to roleAsDescribed / "a teammate".
  // A capitalized email local-part ("Hjumare") is not a name; it just looks
  // like one, which is worse than showing nothing.
  /** Every admin of the organisation, because one of them has to decide and any of them may. */
  private async tellTheAdminsSomebodyIsWaiting(
    organizationId: string,
    groundId: string,
    inviterId: string,
    who: string,
  ): Promise<void> {
    const [admins, inviter, ground] = await Promise.all([
      this.prisma.user.findMany({
        where: { organizationId, role: 'ADMIN', isActive: true, deletedAt: null },
        select: { email: true, firstName: true },
      }),
      this.prisma.user.findUnique({ where: { id: inviterId }, select: { firstName: true, lastName: true, email: true } }),
      this.prisma.ground.findUnique({ where: { id: groundId }, select: { label: true } }),
    ]);
    const addedBy = inviter
      ? [inviter.firstName, inviter.lastName].filter(Boolean).join(' ') || inviter.email
      : 'somebody on your team';
    for (const admin of admins) {
      await this.email
        .sendSomebodyIsWaiting(admin.email, admin.firstName ?? 'there', who, addedBy, ground?.label ?? null)
        .catch((err: any) => this.logger.warn(`Waiting-notice to ${admin.email} failed: ${err.message}`));
    }
  }

  private resolveName(email: string, names?: { firstName?: string; lastName?: string }): [string, string] {
    if (names?.firstName) return [names.firstName, names.lastName ?? ''];
    return ['', ''];
  }
}
