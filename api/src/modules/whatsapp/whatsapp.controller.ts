import { Controller, Get, Post, Query, Body, Logger, ForbiddenException, Req, Res } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';
import { ConversationService } from '../conversation';
import { CheckInStatus } from '@prisma/client';

/**
 * Inbound WhatsApp webhook. Meta calls GET once to verify the endpoint, then POSTs every inbound
 * message here. Both routes are unauthenticated by necessity — Meta cannot hold a Groundwork
 * session token — so each carries its own proof: GET is guarded by the shared verify token, and
 * POST verifies `X-Hub-Signature-256` over the raw body before a single field is read.
 *
 * THAT LAST SENTENCE USED TO READ "POST trusts Meta's payload shape (add X-Hub-Signature-256
 * verification before going live with real traffic)". The verification was implemented and this
 * comment was not updated, so an audit of the code found an unsigned webhook that had in fact been
 * signed for some time. A comment that understates the code is not harmless: it is what somebody
 * reads when deciding whether this endpoint is safe to expose.
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

  /* Bare text, not the { success, data } envelope: Meta compares the body to the challenge byte for byte. Found 10 Sep 2026. */
  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ): void {
    const expected = this.config.get<string>('whatsapp.verifyToken');
    if (mode === 'subscribe' && expected && token === expected) {
      res.status(200).type('text/plain').send(challenge);
      return;
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

      /*
       * THE FIRST THING THEY WROTE IS NOT DROPPED. On a NOT_STARTED check-in this called open() and
       * threw the person's text away, so whatever they said to start with was never their turn. Open
       * first - that is the door that meters - then hand their words in, and send both replies as one.
       */
      let reply: string;
      if (openCheckIn.status === CheckInStatus.NOT_STARTED) {
        const opened = await this.conversation.open(openCheckIn.id, user.id);
        const answered = await this.conversation.sendMessage(openCheckIn.id, user.id, text);
        reply = `${opened.reply}\n\n${answered.reply}`;
      } else {
        reply = (await this.conversation.sendMessage(openCheckIn.id, user.id, text)).reply;
      }
      await this.whatsapp.sendMessage(fromNumber, reply, { checkInId: openCheckIn.id, kind: 'reply' });
    } catch (err: any) {
      /*
       * SILENCE IS THE ONE OUTCOME THIS CHANNEL CANNOT PRODUCE. A spent balance, a paused ground, an
       * already-complete check-in and a failed model call all throw with a sentence written for the
       * person - and this caught every one of them, logged it, and told the person nothing. The
       * sentence goes back to them; only if THAT send fails is it a log line.
       */
      const said = err?.response?.message ?? err?.message ?? 'Something went wrong on our side. Try again in a moment.';
      const to = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
      const told = to ? await this.whatsapp.sendMessage(to, Array.isArray(said) ? said.join(' ') : String(said), { kind: 'refusal' }).catch(() => ({ sent: false })) : { sent: false };
      if (!told.sent) this.logger.error(`WhatsApp inbound handling failed and the person could not be told: ${err?.message}`);
    }
    return { received: true };
  }
}
