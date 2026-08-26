import { Controller, Get, Post, Query, Body, Logger, ForbiddenException, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';
import { ConversationService } from '../conversation';
import { CheckInStatus } from '@prisma/client';

/**
 * Inbound WhatsApp webhook. Meta calls GET once to verify the endpoint, then
 * POSTs every inbound message here. Both routes are unauthenticated by
 * necessity (Meta cannot hold a Groundwork session token) - GET is guarded by
 * the shared verify token, POST trusts Meta's payload shape (add X-Hub-
 * Signature-256 verification before going live with real traffic).
 */
@Public()
@Controller('webhooks/whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private whatsapp: WhatsAppService,
    private conversation: ConversationService,
  ) {}

  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    const expected = this.config.get<string>('whatsapp.verifyToken');
    if (mode === 'subscribe' && expected && token === expected) {
      return challenge;
    }
    throw new ForbiddenException('Webhook verification failed');
  }

  @Post()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  async receive(@Req() req: RawBodyRequest<Request>): Promise<{ received: true }> {
    /**
     * SIGNATURE FIRST, BEFORE A SINGLE FIELD OF THE BODY IS READ.
     *
     * Everything below derives identity from `message.from` and then writes to that person's
     * private check-in as them, so the only safe place for this check is before any of it. Throws
     * on a missing secret, missing header or mismatch - see `verifySignature` for why fail-closed
     * is the right default here.
     */
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    this.whatsapp.verifySignature(req.headers as Record<string, string | string[] | undefined>, raw);

    /**
     * AND NOT AT ALL WHEN THE CHANNEL IS OFF. The toggle and the credentials govern SENDING; this
     * makes them govern receiving too, so an unconfigured deployment has no live inbound path.
     */
    if (!(await this.whatsapp.isEnabled())) return { received: true };

    const body = req.body as any;
    try {
      const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (!message || message.type !== 'text') return { received: true };

      const fromNumber: string = message.from;
      const text: string = message.text?.body ?? '';

      // Auto-detect: match the sender's phone number to a known account.
      const user = await this.whatsapp.findUserByPhoneNumber(fromNumber);
      if (!user) {
        await this.whatsapp.sendMessage(fromNumber, "We don't recognize this number yet. Add it in your Groundwork Settings, then message us again.");
        return { received: true };
      }

      // Route to their next open check-in (started or waiting), across any ground.
      const openCheckIn = await this.prisma.checkIn.findFirst({
        where: {
          participant: { userId: user.id },
          status: { in: [CheckInStatus.NOT_STARTED, CheckInStatus.IN_PROGRESS] },
          OR: [{ availableFrom: null }, { availableFrom: { lte: new Date() } }],
        },
        orderBy: { createdAt: 'asc' },
      });
      if (!openCheckIn) {
        await this.whatsapp.sendMessage(fromNumber, "You don't have an open check-in right now. We'll message you here as soon as your next one is ready.");
        return { received: true };
      }

      const result =
        openCheckIn.status === CheckInStatus.NOT_STARTED
          ? await this.conversation.open(openCheckIn.id, user.id)
          : await this.conversation.sendMessage(openCheckIn.id, user.id, text);

      await this.whatsapp.sendMessage(fromNumber, result.reply);
    } catch (err: any) {
      this.logger.error(`WhatsApp inbound handling failed: ${err.message}`);
    }
    return { received: true };
  }
}
