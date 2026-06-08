import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { AnthropicService } from './anthropic.service';
import { ConversationContextService } from './context.service';
import { BillingModule } from '../billing';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [BillingModule, DocumentsModule],
  controllers: [ConversationController],
  providers: [ConversationService, AnthropicService, ConversationContextService],
  exports: [ConversationService, AnthropicService],
})
export class ConversationModule {}
