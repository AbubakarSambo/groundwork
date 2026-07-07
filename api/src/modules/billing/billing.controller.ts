import { Controller, Delete, Get, Patch, Post, Req, Param, Headers, HttpCode, HttpStatus, Logger, Body, Query, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { CurrentUser, Roles, Role, Public } from '../../common';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private readonly billing: BillingService,
    private readonly stripe: StripeService,
  ) {}

  @Get('status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Billing status: active grounds with session balances and saved card' })
  async status(@CurrentUser('organizationId') organizationId: string) {
    return this.billing.getStatus(organizationId);
  }

  @Delete('subscription')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cancel the account — marks org CANCELLED, sends data-portability notice' })
  async cancelSubscription(@CurrentUser('organizationId') organizationId: string) {
    return this.billing.cancelSubscription(organizationId);
  }

  @Post('contributor-code')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Apply a contributor code to activate billing without payment' })
  async applyContributorCode(@CurrentUser('organizationId') organizationId: string, @Body() body: { code: string }) {
    return this.billing.applyContributorCode(organizationId, body.code);
  }

  @Post('purchase-session')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a Stripe Checkout session to purchase check-in sessions at $5 each' })
  async purchaseSession(
    @CurrentUser('organizationId') organizationId: string,
    @Body() body: { groundId: string; quantity?: number },
  ) {
    return this.billing.purchaseSession(organizationId, body.groundId, body.quantity);
  }

  @Get('can-create-ground')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Check if the org can create a new ground (free first ground or valid access code)' })
  async canCreateGround(
    @CurrentUser('organizationId') organizationId: string,
    @Query('code') accessCode?: string,
  ) {
    return this.billing.canCreateGround(organizationId, accessCode);
  }

  @Post('contributor-codes')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Generate a contributor code that grants sessions to a ground' })
  async generateContributorCode(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { sessionsGranted: number; note?: string; allowCodeCreation?: boolean; parentCodeId?: string },
  ) {
    return this.billing.generateContributorCode(
      organizationId,
      userId,
      body.sessionsGranted,
      body.note,
      body.allowCodeCreation ?? false,
      body.parentCodeId,
    );
  }

  @Post('contributor-codes/send-to-email')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Generate a contributor code and email it directly to a recipient' })
  async sendContributorCodeToEmail(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { email: string; sessionsGranted: number; note?: string },
  ) {
    return this.billing.sendContributorCodeToEmail(
      organizationId,
      userId,
      body.email,
      body.sessionsGranted,
      body.note,
    );
  }

  @Post('contributor-codes/redeem')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Redeem a contributor code to add sessions to a ground' })
  async redeemContributorCode(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { code: string; groundId: string },
  ) {
    return this.billing.redeemContributorCode(body.code, body.groundId, organizationId, userId);
  }

  @Patch('contributor-codes/:codeId/disable')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Disable a contributor code' })
  async disableCode(
    @CurrentUser('organizationId') organizationId: string,
    @Param('codeId') codeId: string,
  ) {
    return this.billing.disableCode(codeId, organizationId);
  }

  @Get('contributor-codes/:codeId/share-card')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get shareable card info for a contributor code' })
  async getShareCard(
    @CurrentUser('organizationId') organizationId: string,
    @Param('codeId') codeId: string,
  ) {
    const codes = await this.billing.getCodeStats(organizationId);
    const found = codes.find((c) => c.id === codeId);
    if (!found) throw new ForbiddenException('Code not found or does not belong to your organization.');
    return {
      code: found.code,
      expiresAt: found.expiresAt,
      daysRemaining: found.daysUntilExpiry,
      note: null,
    };
  }

  @Get('contributor-codes')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all contributor codes for the requesting organization' })
  async listContributorCodes(@CurrentUser('organizationId') organizationId: string) {
    return this.billing.listContributorCodes(organizationId);
  }

  @Get('admin/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Platform admin: stats across all orgs, codes, and redemptions' })
  async platformAdminStats(@CurrentUser('id') userId: string) {
    return this.billing.getPlatformAdminStats(userId);
  }

  @Post('portal')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a Stripe Customer Portal session (manage card, invoices, cancellation)' })
  async portal(@CurrentUser('organizationId') organizationId: string) {
    try {
      return await this.billing.createBillingPortalSession(organizationId);
    } catch (err: any) {
      // Stripe auth errors mean the payment gateway is misconfigured — surface a
      // human-readable message rather than the raw Stripe error string.
      if (err?.type === 'StripeAuthenticationError' || err?.message?.includes('Invalid API Key')) {
        this.logger.error(`Stripe config error: ${err.message}`);
        throw Object.assign(new Error('Payment gateway not configured. Contact support to enable billing.'), { status: 503 });
      }
      throw err;
    }
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook (raw body — verified by signature)' })
  async webhook(@Req() req: any, @Headers('stripe-signature') signature: string) {
    // main.ts enables rawBody so signature verification works.
    const event = this.stripe.constructEvent(req.rawBody, signature);
    await this.billing.handleStripeEvent(event);
    return { received: true, type: event.type };
  }
}
