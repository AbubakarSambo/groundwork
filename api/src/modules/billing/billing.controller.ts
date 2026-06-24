import { Controller, Delete, Get, Post, Req, Headers, HttpCode, HttpStatus, Logger, Body, Query } from '@nestjs/common';
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
  @ApiOperation({ summary: 'Billing status: care-fee state, active grounds, and estimated next charge' })
  async status(@CurrentUser('organizationId') organizationId: string) {
    return this.billing.getStatus(organizationId);
  }

  @Delete('subscription')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cancel the full subscription — marks org CANCELLED, sends data-portability notice' })
  async cancelSubscription(@CurrentUser('organizationId') organizationId: string) {
    return this.billing.cancelSubscription(organizationId);
  }

  @Post('care-fee/checkout')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a Stripe Checkout session for the $20/mo care fee' })
  async careFeeCheckout(@CurrentUser('organizationId') organizationId: string, @Body() body?: { groundId?: string }) {
    return this.billing.createCareFeeCheckout(organizationId, body?.groundId);
  }

  @Post('care-fee/cancel')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cancel the care fee subscription (at period end) — self-serve' })
  async cancelCareFee(@CurrentUser('organizationId') organizationId: string) {
    return this.billing.cancelCareFee(organizationId);
  }

  @Post('contributor-code')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Apply a contributor code to activate billing without payment (legacy)' })
  async applyContributorCode(@CurrentUser('organizationId') organizationId: string, @Body() body: { code: string }) {
    return this.billing.applyContributorCode(organizationId, body.code);
  }

  @Post('purchase-session')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a Stripe Checkout session to purchase one check-in session for $5' })
  async purchaseSession(
    @CurrentUser('organizationId') organizationId: string,
    @Body() body: { groundId: string },
  ) {
    return this.billing.purchaseSession(organizationId, body.groundId);
  }

  @Post('contributor-codes')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Generate a contributor code that grants sessions to a ground' })
  async generateContributorCode(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { sessionsGranted: number; note?: string },
  ) {
    return this.billing.generateContributorCode(organizationId, userId, body.sessionsGranted, body.note);
  }

  @Post('contributor-codes/redeem')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Redeem a contributor code to add sessions to a ground' })
  async redeemContributorCode(@Body() body: { code: string; groundId: string }) {
    return this.billing.redeemContributorCode(body.code, body.groundId);
  }

  @Get('contributor-codes')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all contributor codes for the requesting organization' })
  async listContributorCodes(@CurrentUser('organizationId') organizationId: string) {
    return this.billing.listContributorCodes(organizationId);
  }

  @Post('portal')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a Stripe Customer Portal session (manage card, invoices, cancellation)' })
  async portal(@CurrentUser('organizationId') organizationId: string) {
    return this.billing.createBillingPortalSession(organizationId);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook (raw body — verified by signature)' })
  async webhook(@Req() req: any, @Headers('stripe-signature') signature: string) {
    // main.ts enables rawBody so signature verification works.
    const event = this.stripe.constructEvent(req.rawBody, signature);
    await this.billing.handleStripeEvent(event).catch((err) =>
      this.logger.error(`Webhook handling failed for ${event.type}: ${err.message}`),
    );
    return { received: true, type: event.type };
  }
}
