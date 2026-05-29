import { Controller, Get, Post, Req, Headers, HttpCode, HttpStatus, Logger } from '@nestjs/common';
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
  @ApiOperation({ summary: 'Whether the org is billing-ready (care fee active)' })
  async status(@CurrentUser('organizationId') organizationId: string) {
    return { billingReady: await this.billing.isBillingReady(organizationId) };
  }

  @Post('care-fee/checkout')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a Stripe Checkout session for the $20/mo care fee' })
  async careFeeCheckout(@CurrentUser('organizationId') organizationId: string) {
    return this.billing.createCareFeeCheckout(organizationId);
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
