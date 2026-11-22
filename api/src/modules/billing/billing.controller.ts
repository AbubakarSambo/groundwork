import { Throttle } from '@nestjs/throttler';
import { Controller, Delete, Get, Patch, Post, Req, Param, Headers, HttpCode, HttpStatus, Logger, Body, Query, ForbiddenException, GoneException, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ThreeMonthsOnTheHouseService } from './three-months-on-the-house.service';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { PricingService } from './pricing.service';
import { WhatsAppAddOnService } from './whatsapp-add-on.service';
import { CurrentUser, Roles, Role, Public } from '../../common';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';

/**
 * WHAT EACH READER IS SERVED FROM GET /billing/status (U.19). Only an admin manages billing, so only
 * an admin is served the card, the renewal and ending dates, the check-ins' balances and the usage.
 *
 * A lead or somebody who takes part is served the seat count, the plan and a free run's plan and end,
 * because the People page and the check-in page warn them that the plan is full before they add
 * somebody. A guest, who is from outside and only in one check-in, is served nothing: how many people
 * this organisation has, and what it pays, is none of their business.
 */
export function theStatusAsTheyMayReadIt(status: Awaited<ReturnType<BillingService['getStatus']>>, role: string) {
  if (role === 'ADMIN') return status;
  if (role === 'GUEST') return {};
  return {
    subscription: { plan: status.subscription.plan, status: status.subscription.status },
    people: status.people,
    onTheHouse: status.onTheHouse ? { plan: status.onTheHouse.plan, until: status.onTheHouse.until } : null,
  };
}

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private readonly billing: BillingService,
    private readonly stripe: StripeService,
    private readonly pricing: PricingService,
    private readonly freeRuns: ThreeMonthsOnTheHouseService,
    private readonly whatsappAddOn: WhatsAppAddOnService,
  ) {}

  /**
   * WHAT IS WAITING FOR THIS ADDRESS, ASKED BEFORE THERE IS AN ACCOUNT.
   *
   * "When they sign-up, they see it." The sign-up screen has an email and nothing else, so this is
   * the only shape that can answer: public, throttled, and it says how long and on what plan.
   * Nothing about who granted it, no note, and no hint about the person - an address that has been
   * promised something is all it ever confirms.
   */
  @Public()
  @Throttle({ global: { limit: 20, ttl: 60_000 } })
  @Get('on-the-house')
  @ApiOperation({ summary: 'Whether a free run is waiting for this email address' })
  async onTheHouse(@Query('email') email: string) {
    const waiting = await this.freeRuns.whatIsWaitingFor(email ?? '');
    return waiting ?? { months: 0, plan: null };
  }

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
    return theStatusAsTheyMayReadIt(await this.billing.getStatus(organizationId, role === 'ADMIN'), role);
  }

  /**
   * WHATSAPP ON PLAN AND BILLING (decision 78). Read by anybody signed in, because a person whose
   * check-in stays in the app needs to read why. An admin of the organisation is served the price on
   * their plan, on or off, the trial, this month's use against the limit and what happens at the
   * limit; anybody else is served only whether their check-ins go by WhatsApp and the sentence why not.
   */
  @Get('whatsapp')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'WhatsApp, the paid add-on: on or off, its price on this plan, and this month\'s use against the limit' })
  async whatsapp(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.whatsappAddOn.whatTheyRead(organizationId, role === 'ADMIN');
  }

  /**
   * WHAT THE NEXT INVITATION ADDS TO THE BILL (fix list item 6). Every invite point reads this before it sends, so the person
   * inviting sees "This adds a seat: +$5 a month" when it does. Anybody in the organisation who can invite reads it; a guest
   * cannot invite and is refused. Only the price and whether it applies, never anything about the organisation's bill.
   */
  @Get('next-seat')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.LEAD, Role.MEMBER)
  @ApiOperation({ summary: 'Whether the next invitation adds a paid seat, and the sentence that says so' })
  async nextSeat(@CurrentUser('organizationId') organizationId: string, @Query('name') name?: string) {
    const n = await this.billing.theNextSeat(organizationId, (name ?? '').trim().slice(0, 60) || null);
    /* What adding somebody costs (Hafsah, 21 November 2026): one plain line for the confirm step, and whether it needs a yes. */
    return { addsASeat: n.addsASeat, says: n.says, line: n.line, needsAYes: n.needsAYes, whatsappLine: n.whatsappLine };
  }

  /**
   * "REMIND THEM" (upgrade.txt, "Anyone else, once it has paused"). Anybody in the organisation whose check-in is
   * paused until the team subscribes; at most once a day for each person. A guest is from outside and is refused.
   */
  @Post('remind-the-admins')
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.LEAD, Role.MEMBER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remind the organisation\'s admins that a check-in is paused until the team subscribes (once a day)' })
  async remindTheAdmins(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { groundId?: string },
  ) {
    if (!body?.groundId) throw new BadRequestException('Say which check-in is paused.');
    return this.billing.remindTheAdmins(organizationId, userId, body.groundId);
  }

  @Patch('whatsapp')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Turn the WhatsApp add-on on or off for this organisation (an admin of the organisation only)' })
  async turnWhatsApp(
    @CurrentUser('organizationId') organizationId: string,
    @Body() body: { on: boolean },
  ) {
    await this.whatsappAddOn.turn(organizationId, body?.on);
    return this.whatsappAddOn.whatTheyRead(organizationId, true);
  }

  @Delete('account')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cancel the account - marks org CANCELLED, sends data-portability notice' })
  async cancelAccount(@CurrentUser('organizationId') organizationId: string) {
    return this.billing.cancelAccount(organizationId);
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

  /**
   * A TIER WE DO NOT SELL CANNOT BE CHARGED FOR. This created a real $5 Checkout under a summary that
   * called it legacy and unreachable. The client had stopped offering it; the route had not stopped
   * taking money. Gone, by the product owner's word (11 September 2026): the route stays registered so
   * an old caller gets a clear 410 rather than a 404, and the webhook branch that reads a historical
   * session_fee event stays where it is (billing.service.ts, handleStripeEvent), because Stripe can
   * redeliver an old event long after its writer is gone.
   */
  @Post('purchase-session')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Gone. Sessions are not sold one at a time; a check-in has unlimited sessions on a free ground or a subscription.' })
  purchaseSession() {
    throw new GoneException('Sessions are not sold one at a time. A check-in has unlimited sessions on the free plan and on every subscription.');
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
      body.allowCodeCreation ?? true,
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
  /* Stripe retries on failure and sends bursts on a busy day; the limit is a ceiling against a flood, not a pace (A9). */
  @Throttle({ global: { limit: 240, ttl: 60_000 } })
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

  @Post('credit-session')
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: 'Credit one session to a check-in, with a reason on the ledger (platform admin only)' })
  async creditSession(@CurrentUser('id') userId: string, @Body() body: { groundId: string; reason: string }) {
    return this.billing.creditSession(body?.groundId, body?.reason, userId);
  }

  @Get('stripe-failures')
  @ApiBearerAuth()
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: 'Stripe events we could not handle and have not yet handled on retry (platform admin only)' })
  async stripeFailures() {
    return this.billing.stripeEventFailures();
  }
}
