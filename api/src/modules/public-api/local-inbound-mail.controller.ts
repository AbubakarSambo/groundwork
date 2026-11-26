import { BadRequestException, Body, Controller, NotFoundException, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import * as crypto from 'crypto';
import { Public } from '../../common';
import { DeliveryService } from '../email/delivery.service';
import { theAssistantsAddress } from '../email/the-assistants-address';

/**
 * A LOCAL-ONLY WAY TO PLAY A TEAM MEMBER FORWARDING A MAIL. It builds the same body Resend would post and hands it to the same handler the
 * real webhook reaches (DeliveryService.applyEvent), skipping only the signature, which a local run has no secret for. It does not exist in
 * production: NODE_ENV=production answers 404, and anywhere else it must be switched on with ALLOW_LOCAL_INBOUND_MAIL=true.
 * See docs/ebele-local-testing.md.
 */
@Controller('dev')
export class LocalInboundMailController {
  constructor(private readonly delivery: DeliveryService) {}

  @Public()
  @Throttle({ global: { limit: 240, ttl: 60_000 } })
  @Post('inbound-mail')
  async inject(@Body() body: { from?: string; organizationSlug?: string; to?: string; subject?: string; text?: string; attachments?: Array<{ filename?: string; contentType?: string; contentBase64?: string }> }) {
    if (process.env.NODE_ENV === 'production' || process.env.ALLOW_LOCAL_INBOUND_MAIL !== 'true') throw new NotFoundException('There is nothing here.');
    const to = body?.to ?? (body?.organizationSlug ? theAssistantsAddress({ slug: body.organizationSlug }) : null);
    if (!body?.from || !to) throw new BadRequestException('Say who it is from, and either which organisation (organizationSlug) or the full address it is sent to (to).');
    const id = `local-${crypto.randomUUID()}`;
    const event = {
      type: 'email.received',
      created_at: new Date().toISOString(),
      data: {
        email_id: id,
        from: body.from,
        to: [to],
        subject: body.subject ?? '',
        text: body.text ?? '',
        attachments: (body.attachments ?? []).map((a, i) => ({ id: `${id}-${i}`, filename: a.filename ?? `attachment-${i + 1}`, content_type: a.contentType ?? 'application/octet-stream', content: a.contentBase64 ?? null })),
      },
    };
    await this.delivery.applyEvent(event);
    return { ok: true, emailId: id, sentTo: to };
  }
}
