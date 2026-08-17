import { Module } from '@nestjs/common';
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
  providers: [BillingService, StripeService, PricingService, CodeExpiryScheduler],
  exports: [BillingService, StripeService, PricingService],
})
export class BillingModule {}
