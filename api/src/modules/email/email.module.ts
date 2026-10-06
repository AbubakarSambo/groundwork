import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { RoundDigestService } from './round-digest.service';
import { DeliveryService } from './delivery.service';
import { ResendWebhookController } from './resend-webhook.controller';
import { UnsubscribeController } from './unsubscribe.controller';
import { TheReminderLinkController } from './the-reminder-link.controller';
import { HeldMailCron } from './held-mail.cron';
import { InviteBouncedListener } from './invite-bounced.listener';

@Global()
@Module({
  controllers: [ResendWebhookController, UnsubscribeController, TheReminderLinkController],
  providers: [EmailService, DeliveryService, RoundDigestService, HeldMailCron, InviteBouncedListener],
  exports: [EmailService, RoundDigestService, DeliveryService],
})
export class EmailModule {}
