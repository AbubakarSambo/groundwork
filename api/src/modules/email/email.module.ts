import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { RoundDigestService } from './round-digest.service';
import { DeliveryService } from './delivery.service';
import { ResendWebhookController } from './resend-webhook.controller';
import { UnsubscribeController } from './unsubscribe.controller';
import { TheReminderLinkController } from './the-reminder-link.controller';
import { TheWaysToStopMail } from '../engagement/the-ways-to-stop-mail';
import { HeldMailCron } from './held-mail.cron';
import { InviteBouncedListener } from './invite-bounced.listener';
import { TheDailyDeliveryAlertCron } from './the-daily-delivery-alert.cron';

@Global()
@Module({
  controllers: [ResendWebhookController, UnsubscribeController, TheReminderLinkController],
  providers: [TheWaysToStopMail, EmailService, DeliveryService, RoundDigestService, HeldMailCron, InviteBouncedListener, TheDailyDeliveryAlertCron],
  exports: [TheWaysToStopMail, EmailService, RoundDigestService, DeliveryService],
})
export class EmailModule {}
