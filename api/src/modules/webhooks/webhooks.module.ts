import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WebhooksService } from './webhooks.service';
import { WebhooksListener } from './webhooks.listener';
import { WebhooksCron } from './webhooks.cron';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [PrismaModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhooksListener, WebhooksCron],
  exports: [WebhooksService],
})
export class WebhooksModule {}
