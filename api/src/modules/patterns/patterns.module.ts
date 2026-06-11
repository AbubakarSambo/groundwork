import { Module } from '@nestjs/common';
import { PatternsService } from './patterns.service';
import { PatternsCron } from './patterns.cron';
import { PatternsListener } from './patterns.listener';
import { AlignmentService } from './alignment.service';
import { AlignmentController, AlignmentNarrativeController } from './alignment.controller';
import { ConversationModule } from '../conversation';

@Module({
  imports: [ConversationModule], // for AnthropicService (pattern extraction)
  controllers: [AlignmentController, AlignmentNarrativeController],
  providers: [PatternsService, PatternsCron, PatternsListener, AlignmentService],
  exports: [PatternsService],
})
export class PatternsModule {}
