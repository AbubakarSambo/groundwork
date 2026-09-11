import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { GroundworkEvents, InviteBouncedEvent } from '../../common/events';

/**
 * A BOUNCED INVITE REACHES THE PERSON WHO SENT IT. The bounce was recorded correctly and mirrored onto
 * the participant, and then nothing happened. The lead who typed the address is the one person who
 * can correct it, and their page already has the control for that; this tells them there is something
 * to do.
 */
@Injectable()
export class InviteBouncedListener {
  private readonly logger = new Logger(InviteBouncedListener.name);

  constructor(private readonly prisma: PrismaService, private readonly email: EmailService) {}

  @OnEvent(GroundworkEvents.INVITE_BOUNCED)
  async onInviteBounced(e: InviteBouncedEvent) {
    try {
      const participant = await this.prisma.groundParticipant.findUnique({
        where: { id: e.participantId },
        select: { ground: { select: { id: true, label: true, initiator: { select: { email: true, firstName: true } } } } },
      });
      const lead = participant?.ground?.initiator;
      if (!participant || !lead?.email) return;
      await this.email.sendInviteBounced(lead.email, lead.firstName, e.email, participant.ground.label, `${this.email.frontendUrlForLinks().replace(/\/$/, '')}/grounds/${participant.ground.id}`);
    } catch (err: any) {
      this.logger.warn(`Could not tell the lead about a bounced invite for participant ${e.participantId}: ${err?.message}`);
    }
  }
}
