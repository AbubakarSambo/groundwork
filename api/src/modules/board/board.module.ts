import { Module, forwardRef } from '@nestjs/common';
import { BoardService } from './board.service';
import { BoardListener } from './board.listener';
import { AnthropicService } from '../conversation/anthropic.service';
import { BoardController } from './board.controller';
import { MyWorkController } from './my-work.controller';
import { GroundsModule } from '../grounds/grounds.module';
import { ReportsModule } from '../reports/reports.module';
import { TheLeadsOwnNudgeController } from './the-leads-own-nudge.controller';
import { TheLeadsOwnNudgeService } from '../engagement/the-leads-own-nudge';
import { ThePersonsRecordService } from './the-persons-record.service';

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
  /*
   * And `ReportsModule` for one read: `theReportAsItWasShared`, which puts people's names into the
   * report's own sentences before the board serves them. One implementation of that rule, asked
   * for rather than copied - see the note at gate 3 in board.service.ts. forwardRef for the same
   * reason as above.
   */
  imports: [forwardRef(() => GroundsModule), forwardRef(() => ReportsModule)],
  controllers: [BoardController, MyWorkController, TheLeadsOwnNudgeController],
  providers: [BoardService, BoardListener, AnthropicService, TheLeadsOwnNudgeService, ThePersonsRecordService],
  exports: [BoardService],
})
export class BoardModule {}
