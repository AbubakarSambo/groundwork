import { Controller, Delete, Get, Post, Body, Req, Headers, HttpCode, HttpStatus, Logger } from '@nestjs/common';
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
  async careFeeCheckout(@CurrentUser('organizationId') organizationId: string) {
    return this.billing.createCareFeeCheckout(organizationId);
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
  @ApiOperation({ summary: 'Apply a contributor bypass code to skip payment for platform reviewers' })
  async applyContributorCode(
    @CurrentUser('organizationId') organizationId: string,
    @Body('code') code: string,
  ) {
    return this.billing.applyContributorCode(organizationId, code);
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
