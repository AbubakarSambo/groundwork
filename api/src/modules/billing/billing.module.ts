import { Module } from '@nestjs/common';
import { ThreeMonthsOnTheHouseService } from './three-months-on-the-house.service';
import { APromiseKeptAtSignUp } from './a-promise-kept-at-sign-up';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { PricingService } from './pricing.service';
import { BillingController } from './billing.controller';
import { CodeExpiryScheduler } from './code-expiry.scheduler';
import { UsageModule } from '../usage/usage.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [UsageModule, EmailModule],
  controllers: [BillingController],
  providers: [BillingService, StripeService, PricingService, CodeExpiryScheduler, ThreeMonthsOnTheHouseService, APromiseKeptAtSignUp],
  exports: [BillingService, StripeService, PricingService, ThreeMonthsOnTheHouseService],
})
export class BillingModule {}
