import { Module } from '@nestjs/common';
import { PatternsService } from './patterns.service';
import { PatternsCron } from './patterns.cron';
import { PatternsListener } from './patterns.listener';
import { PatternsController } from './patterns.controller';
import { ConversationModule } from '../conversation';

@Module({
  imports: [ConversationModule], // for AnthropicService (pattern extraction)
  /**
   * `AlignmentController` and `AlignmentNarrativeController` are gone with the `/feed` page
   * that was their only caller. W13-13.
   *
   * The narrative endpoint counted active, stalled and surfaced-pattern grounds and wrote the
   * three numbers into a sentence - the same three numbers the grounds list shows as tiles -
   * and it read no question, so the page's chat answered everything identically. Removed rather
   * than left dead: an endpoint nothing calls is the same rot as a component nothing imports,
   * and git holds it if the feed idea comes back.
   */
  controllers: [PatternsController],
  providers: [PatternsService, PatternsCron, PatternsListener],
  exports: [PatternsService],
})
export class PatternsModule {}
