import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CheckInStatus, TokenType } from '@prisma/client';

/**
 * Participant magic-link entry. A participant is added to a ground by email and
 * notified immediately (never silently). They click the link, accept, and we
 * create or link a User for that email so they can own their private record.
 * The other party's account is never visible to them.
 */
@Injectable()
export class ParticipantsService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private email: EmailService,
  ) {}

  /** Preview an invite from its token — shown before the participant accepts. */
  async preview(token: string) {
    const participant = await this.loadByToken(token);
    const ground = await this.prisma.ground.findUnique({
      where: { id: participant.groundId },
      include: { initiator: { select: { firstName: true, lastName: true } } },
    });
    if (!ground) throw new NotFoundException('Ground not found');

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
  async accept(token: string, names?: { firstName?: string; lastName?: string }) {
    const participant = await this.loadByToken(token);
    const ground = await this.prisma.ground.findUnique({ where: { id: participant.groundId } });
    if (!ground) throw new NotFoundException('Ground not found');

    const email = participant.email.toLowerCase();
    const [firstName, lastName] = this.resolveName(email, names);

    let existingAccount = false;
    const user = await this.prisma.$transaction(async (tx) => {
      // Reuse an existing account for this email, else create one in the
      // ground's organization. Email is globally unique.
      let user = await tx.user.findUnique({ where: { email } });
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
          },
        });
      } else {
        // Pre-existing account — let the client know so it can surface a message.
        existingAccount = true;
      }
      // Cross-org participation: user keeps their home org. The JWT carries their
      // real orgId so their own grounds remain accessible. Only the participant
      // record is linked here.

      await tx.groundParticipant.update({
        where: { id: participant.id },
        data: { userId: user.id },
      });

      return user;
    });

    // Send a password setup link so the participant can return after their
    // initial session without being locked out. Only send when no password
    // is set — existing accounts that already have one don't need this.
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

    // The participant's first session to enter.
    const checkIn = await this.prisma.checkIn.findFirst({
      where: { participantId: participant.id, status: { in: [CheckInStatus.NOT_STARTED, CheckInStatus.IN_PROGRESS] } },
      orderBy: { sessionNumber: 'asc' },
    });

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

  /**
   * Save cofounder intake fields to the GroundParticipant record.
   * Looked up by the check-in ID and the requesting user's ID so it is always
   * owner-scoped — one party can never overwrite another party's intake.
   */
  async saveIntake(checkInId: string, userId: string, data: {
    foundingIntent?: string;
    roleIntent?: string;
    personalIntent?: string;
    exitIntent?: string;
    compensationAsk?: string;
    autonomyAsk?: string;
    recognitionAsk?: string;
    growthAsk?: string;
    relationshipAsk?: string;
    financialFloor?: string;
    stressTolerance?: string;
    relationalTolerance?: string;
  }) {
    const checkIn = await this.prisma.checkIn.findUnique({
      where: { id: checkInId },
      include: { participant: true },
    });
    if (!checkIn) throw new NotFoundException('Check-in not found');
    if (checkIn.participant.userId !== userId) {
      throw new NotFoundException('Check-in not found');
    }

    await this.prisma.groundParticipant.update({
      where: { id: checkIn.participant.id },
      data: {
        foundingIntent:      data.foundingIntent      ?? undefined,
        roleIntent:          data.roleIntent          ?? undefined,
        personalIntent:      data.personalIntent      ?? undefined,
        exitIntent:          data.exitIntent          ?? undefined,
        compensationAsk:     data.compensationAsk     ?? undefined,
        autonomyAsk:         data.autonomyAsk         ?? undefined,
        recognitionAsk:      data.recognitionAsk      ?? undefined,
        growthAsk:           data.growthAsk           ?? undefined,
        relationshipAsk:     data.relationshipAsk     ?? undefined,
        financialFloor:      data.financialFloor      ?? undefined,
        stressTolerance:     data.stressTolerance     ?? undefined,
        relationalTolerance: data.relationalTolerance ?? undefined,
      },
    });

    return { ok: true };
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

  // --- helpers ---

  private async loadByToken(token: string) {
    const participant = await this.prisma.groundParticipant.findUnique({ where: { inviteToken: token } });
    if (!participant) {
      throw new NotFoundException('This invite link is invalid or has already been used');
    }
    // Skip expiry for participants who already accepted — they can always return via their link.
    const alreadyAccepted = !!participant.userId;
    if (!alreadyAccepted && participant.inviteTokenExpiresAt && participant.inviteTokenExpiresAt < new Date()) {
      throw new BadRequestException('This invite link has expired. Ask the person who added you to resend it.');
    }
    return participant;
  }

  private resolveName(email: string, names?: { firstName?: string; lastName?: string }): [string, string] {
    if (names?.firstName) return [names.firstName, names.lastName ?? ''];
    const local = email.split('@')[0] ?? 'there';
    return [local.charAt(0).toUpperCase() + local.slice(1), ''];
  }
}
