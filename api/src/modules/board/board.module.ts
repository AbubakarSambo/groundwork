import { Module, forwardRef } from '@nestjs/common';
import { ReportsModule } from '../reports/reports.module';
import { BoardService } from './board.service';
import { AnthropicService } from '../conversation/anthropic.service';
import { BoardController } from './board.controller';

@Module({
  imports: [forwardRef(() => ReportsModule)],
  controllers: [BoardController],
  providers: [BoardService, AnthropicService],
  exports: [BoardService],
})
export class BoardModule {}
