import { markTheYearEndFilesDelivered } from '../year-end/the-year-end-log';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { isSomethingSentToUs, whatArrived } from './a-message-sent-to-us';
import { whatAForwardIs } from './a-forward-from-a-team-member';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GroundworkEvents, InviteBouncedEvent } from '../../common/events';

/** Context a send site attaches so the delivery can be traced back to a
 * participant/ground. Optional everywhere - sends without context are still
 * logged (kind OTHER) but never touch participant state. */
export interface DeliveryContext {
  /** The person has just asked for exactly this and is waiting: it goes now, in quiet hours too (Fatima round 5, Hafsah's judgement). */
  answeringNow?: boolean;
  kind: 'PARTICIPANT_INVITE' | 'LEAD_INVITE' | 'MAGIC_LINK' | 'REMINDER' | 'OTHER';
  participantId?: string;
  groundId?: string;
  /** Set by the one door when it has decided what became of the mail, for a caller that must know (decision 109). */
  outcome?: 'sent' | 'held' | 'suppressed';
  /** The year-end files' own key (one per job, version and person). Kept with a held mail, so the moment it really goes is recorded against it. */
  sendKey?: string;
  /** Written by the one door on a mail it holds for quiet hours, so the sweep can ask the person's hours again. */
  heldFor?: 'quiet-hours';
  /** The Reply-To of a mail held for quiet hours, given back when it goes. */
  heldReplyTo?: string;
}

const INVITE_KINDS = new Set(['PARTICIPANT_INVITE', 'LEAD_INVITE', 'REMINDER']);
const TIMESTAMP_TOLERANCE_S = 300;

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private events: EventEmitter2,
  ) {
    if (process.env.NODE_ENV === 'production' && !this.webhookSecret()) {
      this.logger.warn(
        'RESEND_WEBHOOK_SECRET is not set: the Resend webhook endpoint will REJECT all events (fail closed). Delivery/bounce tracking is inert until it is configured.',
      );
    }
  }

  private webhookSecret(): string {
    return this.config.get<string>('RESEND_WEBHOOK_SECRET') ?? process.env.RESEND_WEBHOOK_SECRET ?? '';
  }

  /**
   * FOR THE HEALTH SURFACE, NOT A LOG LINE. Unset in production, every delivery and bounce event is
   * rejected and all tracking is inert with no other signal - and the dead-address suppression gets
   * silently worse. /health/mail reports this (main.ts).
   */
  webhookSecretConfigured(): boolean {
    return !!this.webhookSecret();
  }

  /** Record one outbound send. resendId is Resend's email id (or dev-<uuid>
   * in dev mode). Never throws - a logging failure must not break sending. */
  async recordSend(resendId: string, email: string, context?: DeliveryContext): Promise<void> {
    try {
      await this.prisma.emailDelivery.create({
        data: {
          resendId,
          email,
          kind: context?.kind ?? 'OTHER',
          participantId: context?.participantId,
          groundId: context?.groundId,
          status: 'SENT',
        },
      });
      // A fresh invite-kind send resets the participant mirror to SENT (the
      // "fix email & resend" path relies on this).
      if (context?.participantId && INVITE_KINDS.has(context.kind)) {
        await this.prisma.groundParticipant.update({
          where: { id: context.participantId },
          data: { inviteDeliveryStatus: 'SENT' },
        });
      }
    } catch (err: any) {
      this.logger.error(`recordSend failed for ${email}: ${err.message}`);
    }
  }

  /** Svix signature verification (Resend signs webhooks via Svix):
   * HMAC-SHA256 over "{svix-id}.{svix-timestamp}.{rawBody}" with the base64
   * secret after "whsec_". FAIL CLOSED: no secret configured -> reject. */
  verifySignature(headers: Record<string, string | string[] | undefined>, rawBody: Buffer | string): void {
    const secret = this.webhookSecret();
    if (!secret) throw new UnauthorizedException('The email delivery notices cannot be checked here yet, so none was accepted.');

    const svixId = String(headers['svix-id'] ?? '');
    const svixTimestamp = String(headers['svix-timestamp'] ?? '');
    const svixSignature = String(headers['svix-signature'] ?? '');
    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new UnauthorizedException('That delivery notice could not be checked, so it was not accepted.');
    }

    const ts = Number(svixTimestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TIMESTAMP_TOLERANCE_S) {
      throw new UnauthorizedException('That delivery notice was too old to be checked, so it was not accepted.');
    }

    const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
    const signedContent = `${svixId}.${svixTimestamp}.${typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8')}`;
    const expected = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');

    // header carries space-separated "v1,<base64sig>" entries
    const candidates = svixSignature
      .split(' ')
      .map((part) => part.split(',')[1])
      .filter(Boolean);
    const expectedBuf = Buffer.from(expected);
    const ok = candidates.some((c) => {
      const candidateBuf = Buffer.from(c);
      return candidateBuf.length === expectedBuf.length && crypto.timingSafeEqual(candidateBuf, expectedBuf);
    });
    if (!ok) throw new UnauthorizedException('That delivery notice could not be checked, so it was not accepted.');
  }

  /** Apply one Resend event. Upserted by resendId -> replays are idempotent.
   * Unknown event types and unknown email ids are acknowledged and ignored
   * (Resend retries on non-2xx; there is nothing to retry into). */
  /**
   * MAIL ARRIVING IS THE SAME WEBHOOK AS MAIL LEAVING, and it is handled first because it is not a
   * delivery event at all - the status table below has no row for it, so without this it would fall
   * through and be silently discarded as an unknown type.
   *
   * Upserted on the provider's own id: a webhook that is redelivered - which Resend does, on
   * purpose, when we are slow to answer - must not become a second copy of somebody's email.
   */
  async applyEvent(event: { type?: string; data?: any }): Promise<{ ok: true }> {
    /*
     * MAIL TO AN ORGANISATION'S ASSISTANT IS NOT MAIL TO THE COMPANY. An address of the form assistant+<slug>@ goes to the team member's
     * own path (public-api/a-forward-from-a-team-member.service.ts), handed over as an event so this module does not depend on the check-in.
     * Everything else, hello@ included, falls through to the company's inbox below, which is unchanged and never evidence.
     */
    if (isSomethingSentToUs(event?.type) && whatAForwardIs(event)) {
      await this.events.emitAsync(GroundworkEvents.MAIL_FOR_AN_ASSISTANT, { event })
        .catch((err: any) => this.logger?.warn?.(`Handling a forward to an assistant failed: ${err?.message}`));
      return { ok: true };
    }
    if (isSomethingSentToUs(event?.type)) {
      const arrived = whatArrived(event);
      if (!arrived) return { ok: true };
      if (arrived.providerId) {
        await this.prisma.inboundMessage.upsert({
          where: { providerId: arrived.providerId },
          create: arrived as any,
          /* Nothing is updated on a redelivery. The first copy is the message; a later one is the
             same message arriving twice, and overwriting would clear a `readAt` somebody set. */
          update: {},
        }).catch((err: any) => this.logger?.warn?.(`Storing an inbound message failed: ${err?.message}`));
      } else {
        await this.prisma.inboundMessage.create({ data: arrived as any })
          .catch((err: any) => this.logger?.warn?.(`Storing an inbound message failed: ${err?.message}`));
      }
      return { ok: true };
    }

    return this.applyDeliveryEvent(event as any);
  }

  private async applyDeliveryEvent(event: { type?: string; data?: { email_id?: string; to?: string | string[]; bounce?: { message?: string } } }): Promise<{ ok: true }> {
    const statusByType: Record<string, string> = {
      'email.delivered': 'DELIVERED',
      'email.bounced': 'BOUNCED',
      'email.complained': 'COMPLAINED',
    };
    const status = statusByType[event?.type ?? ''];
    const resendId = event?.data?.email_id;
    if (!status || !resendId) return { ok: true };

    if (status === 'DELIVERED') await markTheYearEndFilesDelivered(this.prisma, resendId);
    const delivery = await this.prisma.emailDelivery.findUnique({ where: { resendId } });
    if (!delivery) return { ok: true };

    const detail = event?.data?.bounce?.message ?? null;
    await this.prisma.emailDelivery.update({
      where: { resendId },
      data: { status, detail, statusAt: new Date() },
    });

    // Mirror onto the participant ONLY if this row is the LATEST invite-kind
    // send for them - an old invite's late bounce must not override the state
    // of a newer resend.
    if (delivery.participantId && INVITE_KINDS.has(delivery.kind)) {
      const latest = await this.prisma.emailDelivery.findFirst({
        where: { participantId: delivery.participantId, kind: { in: [...INVITE_KINDS] } },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (latest?.id === delivery.id) {
        await this.prisma.groundParticipant.update({
          where: { id: delivery.participantId },
          data: { inviteDeliveryStatus: status },
        });
        /* And somebody is told. The lead who invited them is the one who can fix the address. */
        if (status === 'BOUNCED') {
          const bounced: InviteBouncedEvent = { participantId: delivery.participantId, email: delivery.email, detail };
          this.events.emit(GroundworkEvents.INVITE_BOUNCED, bounced);
        }
      }
    }
    return { ok: true };
  }
}
