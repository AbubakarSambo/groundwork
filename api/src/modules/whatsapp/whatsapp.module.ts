import { Global, Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { BillingModule } from '../billing/billing.module';
import { HeldForTheNightCron } from './held-for-the-night.cron';

/* The platform webhook controller is registered in PublicApiModule, beside the organisation handler it
   delegates to: one inbound handler, not two. */
@Global()
@Module({
  /* For the WhatsApp add-on and its monthly limit (decision 78), asked before every send. */
  imports: [BillingModule],
  providers: [WhatsAppService, HeldForTheNightCron],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
