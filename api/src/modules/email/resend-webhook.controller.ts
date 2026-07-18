import { Controller, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../../common';
import { DeliveryService } from './delivery.service';

/** Resend delivery webhooks (email.delivered / bounced / complained).
 * Signature-verified against RESEND_WEBHOOK_SECRET (Svix scheme) over the
 * RAW body - main.ts enables rawBody globally (the Stripe precedent).
 * FAIL CLOSED: no secret, bad signature, missing headers or a stale
 * timestamp all reject with 401 and nothing is processed. */
@Controller('webhooks')
export class ResendWebhookController {
  constructor(private delivery: DeliveryService) {}

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post('resend')
  async resend(@Req() req: RawBodyRequest<Request>) {
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    this.delivery.verifySignature(req.headers as Record<string, string | string[] | undefined>, raw);
    return this.delivery.applyEvent(req.body ?? {});
  }
}
