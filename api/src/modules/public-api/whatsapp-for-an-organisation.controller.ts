import { Body, Controller, Delete, Get, HttpCode, Logger, Param, Post, Put, Query, Req, Res } from '@nestjs/common';
import { LANGUAGES_WE_CONVERSE_IN } from './a-whatsapp-message-is-routed';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { RawBodyRequest } from '@nestjs/common';
import { Public, CurrentUser, Roles, Role } from '../../common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { WhatsAppForAnOrganisationService } from './whatsapp-for-an-organisation.service';

/**
 * AN ORGANISATION'S WHATSAPP, IN TWO HALVES.
 *
 * The admin half, under Connect: connect a number, read the state, test it, switch it off, remove
 * it. The Meta half, per organisation: GET answers the subscribe handshake with the organisation's
 * own verify token; POST is checked against the organisation's own app secret and routed to the
 * person who wrote. Nothing here depends on the platform number.
 */
@ApiTags('whatsapp')
@Controller()
export class WhatsAppForAnOrganisationController {
  private readonly logger = new Logger(WhatsAppForAnOrganisationController.name);
  /** How many inbound webhooks named an organisation we do not have. See receive(). */
  private unknownOrganisations = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly inbound: WhatsAppForAnOrganisationService,
  ) {}

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
    return {
      connection: await this.whatsapp.connectionFor(organizationId),
      webhookPath: `/api/v1/webhooks/whatsapp/${organizationId}`,
      languages: Object.values(LANGUAGES_WE_CONVERSE_IN),
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
    if (mode === 'subscribe' && own && token === own.verifyToken) { res.status(200).type('text/plain').send(challenge); return; }
    /* The same answer for a wrong token and an unknown organisation, so this cannot be used to find out which exist. */
    res.status(403).type('text/plain').send('Verification failed');
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
    this.whatsapp.verifySignatureWith(own.appSecret, req.headers as Record<string, string | string[] | undefined>, raw);
    if (!own.enabled) return { received: true };
    try {
      await this.inbound.handle(organizationId, req.body);
    } catch (err: any) {
      this.logger.error(`WhatsApp inbound for org ${organizationId} failed: ${err?.message}`);
    }
    return { received: true };
  }
}
