import { Controller, Delete, Get, Patch, Post, Req, Param, Headers, HttpCode, HttpStatus, Logger, Body, Query, ForbiddenException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { PricingService } from './pricing.service';
import { CurrentUser, Roles, Role, Public } from '../../common';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private readonly billing: BillingService,
    private readonly stripe: StripeService,
    private readonly pricing: PricingService,
  ) {}

  @Public()
  @Get('pricing')
  @ApiOperation({ summary: 'Current subscription pricing per plan - what /pricing and /billing actually charge' })
  async getPricing() {
    /**
     * Plans AND the free limits, in one response. The client used to get the plans here and hold
     * its own copy of the free limit, because there was nowhere to read it from.
     */
    return this.pricing.publicPricing();
  }

  @Get('status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Billing status: active grounds with session balances and saved card' })
  async status(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('role') role: string,
  ) {
    /*
     * USAGE IS FOR AN ADMIN. THE SEAT COUNT IS FOR EVERYBODY WHO INVITES SOMEBODY.
     *
     * This route has never had a role guard, and that is right: the ground page reads it to warn
     * that a plan is full before somebody adds a participant, and a lead adding one needs the same
     * warning an admin gets. Guarding the route would make that warning silently stop appearing for
     * exactly the people the product now expects to run check-ins.
     *
     * But adding usage counts to it widened what a non-admin could read - how many check-ins this
     * organisation has run, how many reports went out, how many people take part - which is nobody's
     * business but the admin's. So the counts are the part that is gated, not the route.
     */
    return this.billing.getStatus(organizationId, role === 'ADMIN');
  }

  @Delete('account')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cancel the account - marks org CANCELLED, sends data-portability notice' })
  async cancelAccount(@CurrentUser('organizationId') organizationId: string) {
    return this.billing.cancelAccount(organizationId);
  }

  @Post('free-extension')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Claim one free session extension for the org (one-time per org)' })
  async claimFreeExtension(
    @CurrentUser('organizationId') organizationId: string,
    @Body() body: { groundId: string },
  ) {
    return this.billing.claimFreeExtension(organizationId, body.groundId);
  }

  @Post('subscription')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a Stripe recurring checkout session for an org subscription plan' })
  async createSubscription(
    @CurrentUser('organizationId') organizationId: string,
    @Body() body: { plan: string },
  ) {
    return this.billing.createSubscription(organizationId, body.plan as any);
  }

  @Delete('subscription')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cancel the org subscription at the end of the paid period. Access continues until then.' })
  async cancelSubscription(@CurrentUser('organizationId') organizationId: string) {
    return this.billing.cancelSubscription(organizationId);
  }

  @Post('subscription/keep')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Undo a scheduled cancellation before the date it would have ended' })
  async keepSubscription(@CurrentUser('organizationId') organizationId: string) {
    return this.billing.keepSubscription(organizationId);
  }

  @Patch('subscription/plan')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Change the org subscription to a different plan, prorating the difference' })
  async changeSubscriptionPlan(
    @CurrentUser('organizationId') organizationId: string,
    @Body() body: { plan: string },
  ) {
    return this.billing.changeSubscriptionPlan(organizationId, body.plan as any);
  }

  @Patch('subscription/pause')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Pause the org subscription' })
  async pauseSubscription(@CurrentUser('organizationId') organizationId: string) {
    return this.billing.pauseSubscription(organizationId);
  }

  @Patch('subscription/resume')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Resume a paused org subscription' })
  async resumeSubscription(@CurrentUser('organizationId') organizationId: string) {
    return this.billing.resumeSubscription(organizationId);
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
  @ApiOperation({ summary: 'LEGACY - per-session purchase. Sessions are not sold; no user-facing surface calls this. Retained only because live Stripe records may reference it.' })
  async purchaseSession(
    @CurrentUser('organizationId') organizationId: string,
    @Body() body: { groundId: string; quantity?: number },
  ) {
    return this.billing.purchaseSession(organizationId, body.groundId, body.quantity);
  }

  @Get('can-create-ground')
  @ApiBearerAuth()
  /**
   * NOT ADMIN-ONLY, BECAUSE CREATING A CHECK-IN IS NOT ADMIN-ONLY.
   *
   * `POST /grounds` carries no role guard: any member of an organisation can open a check-in, and
   * `canRunThisGround` on the client is `isInitiator || isOrgAdmin` precisely so that they can. This
   * endpoint only ASKS whether the org is allowed to open another one, and it was the stricter of
   * the two - so a member could create a check-in but not find out whether they were permitted to.
   *
   * What they got instead was "Access denied - you do not have permission to perform this action"
   * on opening /grounds/new, over a page that then rendered and worked. The toast was true about the
   * request and false about the person.
   *
   * It returns the organisation's own allowance - whether another is permitted, why, and how many
   * have been used. Nothing in it belongs to another person or another org.
   */
  @ApiOperation({ summary: 'Check if the org can create a new ground (free first ground or valid access code)' })
  async canCreateGround(
    @CurrentUser('organizationId') organizationId: string,
    @Query('code') accessCode?: string,
  ) {
    return this.billing.canCreateGround(organizationId, accessCode);
  }

  @Post('contributor-codes')
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard)
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
  @UseGuards(PlatformAdminGuard)
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
  @UseGuards(PlatformAdminGuard)
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
      // Stripe auth errors mean the payment gateway is misconfigured - surface a
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
  @ApiOperation({ summary: 'Stripe webhook (raw body - verified by signature)' })
  async webhook(@Req() req: any, @Headers('stripe-signature') signature: string) {
    // main.ts enables rawBody so signature verification works. A bad signature still throws: an
    // event we cannot trust is not an event we keep.
    const event = this.stripe.constructEvent(req.rawBody, signature);
    try {
      await this.billing.handleStripeEvent(event);
      return { received: true, type: event.type };
    } catch (err) {
      /*
       * A THROW HERE USED TO BE A NON-2XX, and a deterministic failure then stuck for ever: Stripe
       * retried on its schedule, every retry failed the same way, and no operator was told. The
       * event is kept with what went wrong, Stripe is answered 200 so it stops, and the retry runs
       * from our record - where a person can also see it (GET /billing/stripe-failures).
       */
      await this.billing.recordStripeEventFailure(event, err);
      return { received: true, type: event.type, held: true };
    }
  }

  @Get('stripe-failures')
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: 'Stripe events we could not handle and have not yet handled on retry (platform admin only)' })
  async stripeFailures() {
    return this.billing.stripeEventFailures();
  }
}
