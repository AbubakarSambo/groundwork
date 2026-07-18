import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/** Context a send site attaches so the delivery can be traced back to a
 * participant/ground. Optional everywhere - sends without context are still
 * logged (kind OTHER) but never touch participant state. */
export interface DeliveryContext {
  kind: 'PARTICIPANT_INVITE' | 'LEAD_INVITE' | 'MAGIC_LINK' | 'REMINDER' | 'OTHER';
  participantId?: string;
  groundId?: string;
}

const INVITE_KINDS = new Set(['PARTICIPANT_INVITE', 'LEAD_INVITE', 'REMINDER']);
const TIMESTAMP_TOLERANCE_S = 300;

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
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
    if (!secret) throw new UnauthorizedException('webhook secret not configured');

    const svixId = String(headers['svix-id'] ?? '');
    const svixTimestamp = String(headers['svix-timestamp'] ?? '');
    const svixSignature = String(headers['svix-signature'] ?? '');
    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new UnauthorizedException('missing svix headers');
    }

    const ts = Number(svixTimestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TIMESTAMP_TOLERANCE_S) {
      throw new UnauthorizedException('timestamp outside tolerance');
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
    if (!ok) throw new UnauthorizedException('signature mismatch');
  }

  /** Apply one Resend event. Upserted by resendId -> replays are idempotent.
   * Unknown event types and unknown email ids are acknowledged and ignored
   * (Resend retries on non-2xx; there is nothing to retry into). */
  async applyEvent(event: { type?: string; data?: { email_id?: string; to?: string | string[]; bounce?: { message?: string } } }): Promise<{ ok: true }> {
    const statusByType: Record<string, string> = {
      'email.delivered': 'DELIVERED',
      'email.bounced': 'BOUNCED',
      'email.complained': 'COMPLAINED',
    };
    const status = statusByType[event?.type ?? ''];
    const resendId = event?.data?.email_id;
    if (!status || !resendId) return { ok: true };

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
      }
    }
    return { ok: true };
  }
}
