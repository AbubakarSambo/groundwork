import { answerFirst } from './answer-the-webhook-then-do-the-work';
import * as crypto from 'crypto';
import { Controller, Get, Post, Query, Body, Logger, ForbiddenException, Req, Res } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';
import { UNKNOWN_NUMBER_SAYING } from './a-message-outside-the-window';
import { theFirstTimeThisIsSaidTo, TOLD_THE_NUMBER_IS_NOT_LINKED } from './said-once-to-a-number';
import { WhatsAppForAnOrganisationService } from '../public-api/whatsapp-for-an-organisation.service';
import { pickWasAsked, pickedOrganisation, whichOrganisationAsText, A_SWITCH_WORD } from '../public-api/a-whatsapp-message-is-routed';

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
    private inbound: WhatsAppForAnOrganisationService,
  ) {}

  /* Bare text, not the { success, data } envelope: Meta compares the body to the challenge byte for byte. Found 10 Sep 2026. */
  @Get()
  async verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ): Promise<void> {
    /* Saved in the back office first, then the server setting (groundworks-own-number.ts). */
    const expected = (await this.whatsapp.ours()).verifyToken;
    if (mode === 'subscribe' && expected && WhatsAppController.sameToken(token, expected)) {
      res.status(200).type('text/plain').send(challenge);
      return;
    }
    throw new ForbiddenException('That request could not be checked as coming from WhatsApp, so it was not accepted.');
  }

  /**
   * THE VERIFY TOKEN, COMPARED IN CONSTANT TIME. A plain === stops at the first wrong character, so
   * how long a refusal takes can say how much of a guess was right. Lengths first, because
   * timingSafeEqual throws on unequal lengths rather than answering false.
   */
  static sameToken(given: string | undefined | null, expected: string): boolean {
    if (typeof given !== 'string') return false;
    const a = Buffer.from(given, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  @Post()
  @Throttle({ global: { limit: 120, ttl: 60_000 } })
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
    await this.whatsapp.verifySignature(req.headers as Record<string, string | string[] | undefined>, raw);

    /**
     * AND NOT AT ALL WHEN THE CHANNEL IS OFF. The toggle and the credentials govern SENDING; this
     * makes them govern receiving too, so an unconfigured deployment has no live inbound path.
     */
    if (!(await this.whatsapp.isEnabled())) return { received: true };

    const body = req.body as any;
    await answerFirst(async () => {
    try {
      /*
       * ONE INBOUND HANDLER, NOT TWO. This route had its own routing body: an organisation-unscoped
       * identity lookup, the oldest open check-in picked in silence, every non-text message dropped,
       * no report on finish. The organisation handler is a superset on every axis that matters and the
       * only one whose identity lookup is tenant-scoped, so this route now does exactly two things of
       * its own - the shared-secret signature above, and working out WHICH organisation the sender
       * means - and hands the message to it. Fixes written once, not twice.
       */
      const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (!message?.from) return { received: true };
      const fromNumber: string = message.from;
      const organizationId = await this.whichOrganisation(fromNumber, message);
      /* Written to Groundwork's number, so every reply goes back on Groundwork's number (survey item 8). */
      if (organizationId) await this.inbound.handle(organizationId, body, 'ours');
    } catch (err: any) {
      /*
       * SILENCE IS THE ONE OUTCOME THIS CHANNEL CANNOT PRODUCE. A spent balance, a paused ground, an
       * already-complete check-in and a failed model call all throw with a sentence written for the
       * person - and this caught every one of them, logged it, and told the person nothing. The
       * sentence goes back to them; only if THAT send fails is it a log line.
       */
      const said = err?.response?.message ?? err?.message ?? 'Something went wrong on my side. Try again in a moment.';
      const to = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
      const told = to ? await this.whatsapp.sendMessage(to, Array.isArray(said) ? said.join(' ') : String(said), { kind: 'refusal' }).catch(() => ({ sent: false })) : { sent: false };
      if (!told.sent) this.logger.error(`WhatsApp inbound handling failed and the person could not be told: ${err?.message}`);
    }
    }, (err) => this.logger.error(`WhatsApp inbound handling stopped: ${err?.message}`));
    return { received: true };
  }

  /**
   * WHICH ORGANISATION THE SENDER MEANS. On one roster: that one. On none: told how to be added. On
   * more than one: asked, as a numbered list, and the answer kept - a bare number is read as the
   * answer only while the question is fresh, the same rule the check-in list uses.
   */
  private async whichOrganisation(fromNumber: string, message: any): Promise<string | null> {
    const orgs = await (this.whatsapp.whichOrganisationsWhereItWorks?.(fromNumber) ?? this.whatsapp.whichOrganisations(fromNumber));
    if (orgs.length === 0) {
      if (await theFirstTimeThisIsSaidTo(this.prisma, fromNumber, TOLD_THE_NUMBER_IS_NOT_LINKED, null)) await this.whatsapp.sendMessage(fromNumber, UNKNOWN_NUMBER_SAYING, { kind: 'refusal' });
      return null;
    }
    if (orgs.length === 1) return orgs[0].id;
    const phone = WhatsAppService.normalize(fromNumber);
    const kept = await this.prisma.whatsAppOrganisationPick.findUnique({ where: { phone } }).catch(() => null);
    const text: string = message?.type === 'text' ? (message.text?.body ?? '') : '';
    if (kept && pickWasAsked(kept.pickPendingAt)) {
      const picked = pickedOrganisation(text, orgs);
      if (picked) {
        await this.prisma.whatsAppOrganisationPick.update({ where: { phone }, data: { organizationId: picked.id, pickPendingAt: null } });
        await this.whatsapp.sendMessage(fromNumber, `${picked.name}. Carry on. What you write here goes to your check-in there. Write "switch" to choose again.`);
        /* Chosen again after "switch": the check-ins open there follow, as "switch" gives inside one organisation. */
        if (kept.organizationId) {
          await this.inbound.handle(picked.id, { entry: [{ changes: [{ value: { messages: [{ from: fromNumber, type: 'text', text: { body: 'switch' } }] } }] }] }, 'ours');
        }
        return null;
      }
    }
    /*
     * "SWITCH" CHOOSES AGAIN (survey item 12). A number on two rosters kept its first pick for good.
     * Now "switch" asks again which organisation, and the answer replaces the pick.
     */
    if (kept?.organizationId && A_SWITCH_WORD.test(text)) {
      await this.prisma.whatsAppOrganisationPick.update({ where: { phone }, data: { pickPendingAt: new Date() } });
      await this.whatsapp.sendMessage(fromNumber, whichOrganisationAsText(orgs), { kind: 'which-one' });
      return null;
    }
    if (kept?.organizationId && orgs.some((o) => o.id === kept.organizationId)) return kept.organizationId;
    await this.prisma.whatsAppOrganisationPick.upsert({
      where: { phone },
      create: { phone, pickPendingAt: new Date() },
      update: { pickPendingAt: new Date() },
    });
    await this.whatsapp.sendMessage(fromNumber, whichOrganisationAsText(orgs), { kind: 'which-one' });
    return null;
  }
}
