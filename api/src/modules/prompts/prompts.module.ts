import { Global, Module } from '@nestjs/common';
import { PromptsService } from './prompts.service';
import { PromptsController } from './prompts.controller';
import { AnthropicService } from '../conversation/anthropic.service';

@Global()
@Module({
  controllers: [PromptsController],
  providers: [PromptsService, AnthropicService],
  exports: [PromptsService],
})
export class PromptsModule {}
