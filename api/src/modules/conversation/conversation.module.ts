import { Module, forwardRef } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController, ClarificationController } from './conversation.controller';
import { AnthropicService } from './anthropic.service';
import { ConversationContextService } from './context.service';
import { RemindService } from './remind.service';
import { BillingModule } from '../billing';
import { DocumentsModule } from '../documents/documents.module';
import { UsageModule } from '../usage/usage.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [BillingModule, forwardRef(() => DocumentsModule), UsageModule, EmailModule],
  controllers: [ConversationController, ClarificationController],
  providers: [ConversationService, AnthropicService, ConversationContextService, RemindService],
  exports: [ConversationService, AnthropicService],
})
export class ConversationModule {}
