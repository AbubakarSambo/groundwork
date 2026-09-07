import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { EmailModule } from '../email/email.module';
import { WebhooksService } from './webhooks.service';
import { WebhooksListener } from './webhooks.listener';
import { WebhooksCron } from './webhooks.cron';
import { WebhooksController } from './webhooks.controller';

@Module({
  /* A dead delivery has to reach a person: see `tellThemItIsDying`. Before this, seven failed
     attempts produced a warning in our own logs and nothing else. */
  imports: [PrismaModule, WorkspaceModule, EmailModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhooksListener, WebhooksCron],
  exports: [WebhooksService],
})
export class WebhooksModule {}
