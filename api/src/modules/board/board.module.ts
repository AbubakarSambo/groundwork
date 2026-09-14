import { Module, forwardRef } from '@nestjs/common';
import { BoardService } from './board.service';
import { BoardListener } from './board.listener';
import { AnthropicService } from '../conversation/anthropic.service';
import { BoardController } from './board.controller';
import { GroundsModule } from '../grounds/grounds.module';

@Module({
  /*
   * For `getSessionProgress` - which round is open and who has not answered it, used by the gate
   * that stops somebody reading everybody else's accounts before giving their own.
   *
   * forwardRef because module wiring is invisible to tsc and to unit tests: an AlignmentModule
   * importing GroundsModule mid-initialisation took this API down entirely earlier today, compiled
   * clean and passed every suite. The cost of the wrapper is nothing; the cost of being wrong is
   * a server that will not boot.
   */
  imports: [forwardRef(() => GroundsModule)],
  controllers: [BoardController],
  providers: [BoardService, BoardListener, AnthropicService],
  exports: [BoardService],
})
export class BoardModule {}
