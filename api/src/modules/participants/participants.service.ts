import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CheckInStatus } from '@prisma/client';

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
      }

      await tx.groundParticipant.update({
        where: { id: participant.id },
        data: { userId: user.id, inviteToken: null, inviteTokenExpiresAt: null },
      });

      return user;
    });

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
    };
  }

  // --- helpers ---

  private async loadByToken(token: string) {
    const participant = await this.prisma.groundParticipant.findUnique({ where: { inviteToken: token } });
    if (!participant) {
      // Already-accepted invites have their token cleared; surface a clear error.
      throw new NotFoundException('This invite link is invalid or has already been used');
    }
    if (participant.inviteTokenExpiresAt && participant.inviteTokenExpiresAt < new Date()) {
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
