import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { AnthropicService } from './anthropic.service';

@Module({
  controllers: [ConversationController],
  providers: [ConversationService, AnthropicService],
  exports: [ConversationService, AnthropicService],
})
export class ConversationModule {}
