import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { RoundDigestService } from './round-digest.service';
import { DeliveryService } from './delivery.service';
import { ResendWebhookController } from './resend-webhook.controller';
import { UnsubscribeController } from './unsubscribe.controller';

@Global()
@Module({
  controllers: [ResendWebhookController, UnsubscribeController],
  providers: [EmailService, DeliveryService, RoundDigestService],
  exports: [EmailService, RoundDigestService, DeliveryService],
})
export class EmailModule {}
