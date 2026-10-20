import { itSendsFromTheirNumber, NOT_FINISHED_SO_GROUNDWORKS_NUMBER } from '../whatsapp/a-connection-that-works';
import { answerFirst } from '../whatsapp/answer-the-webhook-then-do-the-work';
import { Body, Controller, Delete, Get, HttpCode, Logger, Param, Post, Put, Query, Req, Res, BadRequestException, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { MachineTokenGuard, RequiresScope, type MachineCaller } from './machine-token.guard';
import { A_MESSAGE_MAX } from '../../common/dto';
import { ConfigService } from '@nestjs/config';
import { LANGUAGES_WE_CONVERSE_IN } from './a-whatsapp-message-is-routed';
import { THE_NAMES_TO_SUBMIT } from '../whatsapp/a-message-outside-the-window';
import { ApiExcludeEndpoint, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { RawBodyRequest } from '@nestjs/common';
import { theirKey } from '../whatsapp/an-organisations-own-keys';
import { Public, CurrentUser, Roles, Role } from '../../common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { WhatsAppForAnOrganisationService } from './whatsapp-for-an-organisation.service';
import { whatsAppAsTheAdminReadsIt, peopleOnWhatsAppIn, failedThisWeekIn, CALLBACK_PATH } from './whatsapp-as-the-admin-reads-it';

/**
 * AN ORGANISATION'S WHATSAPP, IN TWO HALVES.
 *
 * The admin half, under Connect: connect a number, read the state, test it, switch it off, remove
 * it. The Meta half, per organisation: GET answers the subscribe handshake with the organisation's
 * own verify token; POST is checked against the organisation's own app secret and routed to the
 * person who wrote. Nothing here depends on the platform number.
 */
@ApiTags('whatsapp')
/** One message off their number: who sent it, what they said, or the file they sent. */
class ARelayedMessageDto {
  @ApiProperty({ example: '2348012345678', description: "The sender's number, in any format" })
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  from!: string;

  @ApiPropertyOptional({ description: 'What they typed' })
  @IsOptional()
  @IsString()
  @MaxLength(A_MESSAGE_MAX)
  text?: string;

  @ApiPropertyOptional({ description: "WhatsApp's own message id, so a redelivery is not a second answer" })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  messageId?: string;

  @ApiPropertyOptional({ description: 'A photo or document they sent, which goes onto their check-in as evidence' })
  @IsOptional()
  media?: { base64: string; mimeType?: string; fileName?: string; caption?: string };
}

@Controller()
export class WhatsAppForAnOrganisationController {
  private readonly logger = new Logger(WhatsAppForAnOrganisationController.name);
  /** How many inbound webhooks named an organisation we do not have. See receive(). */
  private unknownOrganisations = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly inbound: WhatsAppForAnOrganisationService,
    private readonly config: ConfigService,
  ) {}

  /* Every template the product starts (THE_NAMES_TO_SUBMIT). Every other send is a reply, which needs no template. */
  private static readonly THE_ONES_WE_START = THE_NAMES_TO_SUBMIT;

  /* ---------------- the admin half ---------------- */

  @Get('integrations/whatsapp')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "The organisation's WhatsApp connection, secrets withheld" })
  async connection(@CurrentUser('organizationId') organizationId: string) {
    /*
     * The languages the check-in can be held in, from the one list that decides it. Named here so
     * the setup page can say them rather than keeping its own copy, which is how a page ends up
     * promising a language nobody added.
     */
    /*
     * AND WHETHER WE CAN START A CONVERSATION AT ALL.
     *
     * WhatsApp only lets a business send free text within 24 hours of the person last writing.
     * Outside that, only wording Meta has approved goes - so until our three are approved, every
     * message the product STARTS is recorded as not sent rather than sent and refused.
     *
     * Which means an admin can set all of this up correctly and nothing will ever arrive, with no
     * way to tell that from a broken connection. So the page is told, and it is told from the same
     * setting the sender reads: the day somebody adds the approved names, the warning goes on its
     * own rather than waiting for a person to notice the copy is stale.
     */
    /*
      AND WHOSE APPROVAL IT IS. On their own number it is theirs to get: their Meta app, their
      submission. So this answers from THEIR list where they have a connection, and only falls back
      to ours for the case that is our number. It read the env var either way, which told a customer
      who had done everything right that they still could not start a conversation.
    */
    /*
      NO SECRET, AND NO PART OF ONE. This used to hand back the connection as WhatsAppService builds
      it, which carries the verify token itself and the access token's last four characters, and both
      are a credential or a piece of one. The row is read here with the secrets left out of what is
      served; whether the verify token is set is a yes or a no. The setup page's "Verify token, Copy"
      step read the token from here, and now needs its own way to it (docs/answers-from-engine.md).
    */
    const now = new Date();
    const [row, org, toggle, peopleOnWhatsApp, failedThisWeek] = await Promise.all([
      this.prisma.whatsAppConnection.findUnique({
        where: { organizationId },
        select: {
          phoneNumberId: true, businessAccountId: true, displayNumber: true, approvedTemplates: true, enabled: true,
          connectedAt: true, lastInboundAt: true, lastOutboundAt: true, webhookVerifiedAt: true,
          verifyToken: true,
          /* Read only to say whether the row works (a-connection-that-works.ts); never served. */
          accessToken: true, appSecret: true,
        },
      }),
      this.prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
      this.whatsapp.getToggleState(),
      peopleOnWhatsAppIn(this.prisma, organizationId),
      failedThisWeekIn(this.prisma, organizationId, now),
    ]);
    const connection = row
      ? {
          phoneNumberId: row.phoneNumberId,
          businessAccountId: row.businessAccountId,
          displayNumber: row.displayNumber,
          approvedTemplates: row.approvedTemplates,
          enabled: row.enabled,
          connectedAt: row.connectedAt,
          lastInboundAt: row.lastInboundAt,
          lastOutboundAt: row.lastOutboundAt,
          /* U.18: the callback address is proven once Meta's handshake answered, or a message came in through it. */
          webhookProvenAt: row.webhookVerifiedAt ?? row.lastInboundAt ?? null,
          /* Whether this is the number in use. A row switched on but half set up, or never proven, is not: Groundwork's own number is (Drop Access, 21 October). */
          inUse: itSendsFromTheirNumber(row),
          ...(row.enabled && !itSendsFromTheirNumber(row) ? { notInUseSays: NOT_FINISHED_SO_GROUNDWORKS_NUMBER } : {}),
        }
      : null;
    const ours = this.config.get<string[]>('whatsapp.approvedTemplates') ?? [];
    const approved = row ? row.approvedTemplates : ours;
    const canStartAConversation = WhatsAppForAnOrganisationController.THE_ONES_WE_START.every((t) => approved.includes(t));
    return {
      connection,
      webhookPath: CALLBACK_PATH(organizationId),
      languages: Object.values(LANGUAGES_WE_CONVERSE_IN),
      canStartAConversation,
      /* The exact names to submit to Meta, from the one place that defines them. A page that typed
         them out would be a fourth copy of a name Meta matches byte for byte. */
      theNamesToSubmit: WhatsAppForAnOrganisationController.THE_ONES_WE_START,
      approvedHere: approved,
      /* The Connections page's card, in sentences (F1). See whatsapp-as-the-admin-reads-it. */
      ...whatsAppAsTheAdminReadsIt({
        organizationId,
        organisationName: org?.name ?? '',
        /* A row switched on but not finished is read as no connection, as the sender reads it: Groundwork's number is in use. */
        own: row && (!row.enabled || itSendsFromTheirNumber(row)) ? { enabled: row.enabled, displayNumber: row.displayNumber, verifyTokenSet: !!row.verifyToken } : null,
        groundwork: {
          credentialsConfigured: toggle.credentialsConfigured,
          switchedOn: toggle.adminEnabled,
          /* Saved in the back office first, then WHATSAPP_DISPLAY_NUMBER (groundworks-own-number.ts). */
          displayNumber: toggle.displayNumber ?? this.config.get<string>('whatsapp.displayNumber') ?? null,
        },
        publicApiUrl: this.config.get<string>('app.publicApiUrl') ?? null,
        peopleOnWhatsApp,
        failedThisWeek,
        remindersApproved: canStartAConversation,
      }),
    };
  }

  @Put('integrations/whatsapp')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Connect or update the organisation\'s own WhatsApp number' })
  async connect(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: { phoneNumberId?: string; businessAccountId?: string; displayNumber?: string; accessToken?: string; appSecret?: string },
  ) {
    return { connection: await this.whatsapp.connect(organizationId, dto ?? {}), webhookPath: `/api/v1/webhooks/whatsapp/${organizationId}` };
  }

  /**
   * WHICH TEMPLATES META APPROVED FOR THIS ORGANISATION.
   *
   * Recorded by the admin because only they can see their own Meta app. Nothing here submits
   * anything to Meta - we could not, it is their app - so this is a statement of fact about the
   * world, and the send path believes it. A name that is not one of ours is refused rather than
   * stored, because a typo here reads as "approved" and then every send is refused by Meta with
   * the reason a long way from this page.
   */
  @Post('integrations/whatsapp/templates')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Record which of our template names Meta has approved for this organisation' })
  async templates(
    @CurrentUser('organizationId') organizationId: string,
    @Body() dto: { approved?: string[] },
  ) {
    const asked = Array.isArray(dto?.approved) ? dto.approved : [];
    const unknown = asked.filter((n) => !WhatsAppForAnOrganisationController.THE_ONES_WE_START.includes(n));
    if (unknown.length) {
      throw new BadRequestException(`Not one of ours: ${unknown.join(', ')}. The names are ${WhatsAppForAnOrganisationController.THE_ONES_WE_START.join(', ')}.`);
    }
    const own = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId } });
    if (!own) throw new BadRequestException('Connect your WhatsApp number first.');
    await this.prisma.whatsAppConnection.update({
      where: { organizationId },
      data: { approvedTemplates: [...new Set(asked)] },
    });
    return { approved: [...new Set(asked)] };
  }

  @Post('integrations/whatsapp/enabled')
  @HttpCode(200)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Switch the connection on or off without losing it' })
  async setEnabled(@CurrentUser('organizationId') organizationId: string, @Body() dto: { enabled?: boolean }) {
    return { connection: await this.whatsapp.setConnectionEnabled(organizationId, dto?.enabled !== false) };
  }

  @Post('integrations/whatsapp/test')
  @HttpCode(200)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Send a test message to a number on the organisation\'s connection' })
  async test(@CurrentUser('organizationId') organizationId: string, @Body() dto: { to?: string }) {
    return this.whatsapp.sendTest(organizationId, dto?.to ?? '');
  }

  @Delete('integrations/whatsapp')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove the connection. Nothing sent or received is deleted.' })
  async disconnect(@CurrentUser('organizationId') organizationId: string) {
    return this.whatsapp.disconnect(organizationId);
  }

  /* ---------------- the Meta half ---------------- */

  /*
   * THE CHALLENGE GOES BACK BARE. Every other response here is wrapped as { success, data } by the
   * transform interceptor, and Meta compares the body to the challenge byte for byte - a wrapped
   * "abc123" is a failed subscription. Written straight to the response, as text.
   */
  @Public()
  @Get('webhooks/whatsapp/:organizationId')
  @ApiExcludeEndpoint()
  async verify(
    @Param('organizationId') organizationId: string,
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ): Promise<void> {
    const own = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId }, select: { verifyToken: true } });
    if (mode === 'subscribe' && own && token === own.verifyToken) {
      /* U.18: remembered, so step 3 of the setup page can say the address is proven. A failed write
         must not fail the handshake, which is what actually connects the number. */
      await this.prisma.whatsAppConnection.update({ where: { organizationId }, data: { webhookVerifiedAt: new Date() } }).catch(() => undefined);
      res.status(200).type('text/plain').send(challenge);
      return;
    }
    /* The same answer for a wrong token and an unknown organisation, so this cannot be used to find out which exist. */
    res.status(403).type('text/plain').send('Verification failed');
  }

  /**
   * ONE MESSAGE FROM THEIR OWN WHATSAPP NUMBER, HANDED TO US BY THEIR OWN SYSTEM.
   *
   * "we dont want their customer traffic. what we want is for their team to be able to use their
   * whatsapp for business to do checkin. They use it for their customers too."
   *
   * One number has one webhook, so either we hold it and see everything they receive, or they hold
   * it and hand us the messages that are ours. This is the second: their number stays pointed at
   * their own customer system, and when the sender is one of their team they pass that message here
   * and send the reply we return from their own number.
   *
   * A sender who is not on their roster comes back `{ mine: false }` with no reply and nothing
   * stored - not the number, not the message, not the fact that they asked. Their system carries on
   * as though it had never asked. See their-number-stays-theirs.
   *
   * THE REPLY IS RETURNED, NEVER SENT. We hold no credential for their number in this arrangement
   * and must not: the only thing that ever speaks to their customers is them.
   */
  /*
   * @Public() TAKES THE SESSION GUARD OFF; MachineTokenGuard IS WHAT REPLACES IT (see public-api.controller.ts). Without it the global
   * session guard met the machine token first and refused it ("User not found or inactive"), so a customer's own system could never
   * hand us a message: the relay had never once worked with the credential it is meant to be called with.
   */
  @Public()
  @Post('integrations/whatsapp/relay')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('checkins:write')
  @Throttle({ global: { limit: 240, ttl: 60_000 } })
  @ApiOperation({ summary: "One WhatsApp message from your own number, answered. Returns the reply to send, or that the sender is not one of your people." })
  async relay(
    @Req() req: { machine: MachineCaller },
    @Body() dto: ARelayedMessageDto,
  ): Promise<{ mine: boolean; reply?: string }> {
    const arrived = dto.media?.base64
      ? {
          kind: 'media' as const,
          mediaId: dto.messageId ?? 'relayed',
          mimeType: dto.media.mimeType ?? 'application/octet-stream',
          fileName: dto.media.fileName ?? 'from-whatsapp',
          caption: (dto.media.caption ?? '').trim(),
          /* Their system already holds the file, so it comes with the message rather than being
             fetched back from Meta with a credential we deliberately do not have. */
          buffer: Buffer.from(dto.media.base64, 'base64'),
        }
      : { kind: 'text' as const, text: (dto.text ?? '').trim() };
    if (arrived.kind === 'text' && !arrived.text) return { mine: false };
    return this.inbound.relay(req.machine.organizationId, dto.from, arrived as any, dto.messageId ?? null);
  }

  @Public()
  @Post('webhooks/whatsapp/:organizationId')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  @Throttle({ global: { limit: 240, ttl: 60_000 } })
  async receive(@Param('organizationId') organizationId: string, @Req() req: RawBodyRequest<Request>): Promise<{ received: true }> {
    const own = await this.prisma.whatsAppConnection.findUnique({ where: { organizationId } });
    /* Unknown organisation: acknowledge, so Meta does not retry forever - but SAY SO. This returned 200 with
       no log and no count, so a customer who pointed Meta at the wrong URL was a silence with no evidence
       anywhere. The count is in the line, so a log search shows the rate without a metrics stack. */
    if (!own) {
      this.unknownOrganisations += 1;
      this.logger.warn(`WhatsApp inbound for unknown organisation ${organizationId} (${this.unknownOrganisations} since start); acknowledged and dropped`);
      return { received: true };
    }
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    this.whatsapp.verifySignatureWith(theirKey(own, 'appSecret'), req.headers as Record<string, string | string[] | undefined>, raw);
    if (!own.enabled) return { received: true };
    await answerFirst(
      () => this.inbound.handle(organizationId, req.body),
      (err: any) => this.logger.error(`WhatsApp inbound for org ${organizationId} failed: ${err?.message}`),
    );
    return { received: true };
  }
}
