import { Module } from '@nestjs/common';
import { BoardService } from './board.service';
import { AnthropicService } from '../conversation/anthropic.service';
import { BoardController } from './board.controller';

@Module({
  controllers: [BoardController],
  providers: [BoardService, AnthropicService],
  exports: [BoardService],
})
export class BoardModule {}
