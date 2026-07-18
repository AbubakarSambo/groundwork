import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { DeliveryService } from './delivery.service';
import { ResendWebhookController } from './resend-webhook.controller';

@Global()
@Module({
  controllers: [ResendWebhookController],
  providers: [EmailService, DeliveryService],
  exports: [EmailService, DeliveryService],
})
export class EmailModule {}
