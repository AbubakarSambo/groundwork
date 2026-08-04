import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BoardService } from './board.service';
import { CurrentUser } from '../../common';
import { CoverageVariant, DEFAULT_COVERAGE_VARIANT } from './coverage';

@ApiTags('board')
@ApiBearerAuth()
@Controller('grounds/:id/board')
export class BoardController {
  constructor(private board: BoardService) {}

  @Get()
  @ApiOperation({
    summary:
      'The delivery board for a shared-mode ground. Returns renders:false with a reason for private-mode or sensing-family grounds, which have no board by design.',
  })
  async get(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Query('coverage') coverage?: string,
  ) {
    const variant: CoverageVariant = coverage === 'bar' ? 'bar' : coverage === 'text' ? 'text' : DEFAULT_COVERAGE_VARIANT;
    return this.board.get(id, userId, variant);
  }

  @Post('poll/:optionId/toggle')
  @ApiOperation({ summary: 'Mark yourself available or not for a poll option. The only editable thing on the board.' })
  async togglePoll(
    @Param('id') id: string,
    @Param('optionId') optionId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.board.togglePollAvailability(id, optionId, userId);
  }
}
