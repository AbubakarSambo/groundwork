import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common';
import { AskingForMoreTimeService } from './asking-for-more-time.service';

/** "Ask Wairimu for more time" (U.3). A person taking part reads where it stands, and asks once a day. */
@ApiTags('Grounds')
@ApiBearerAuth()
@Controller('grounds')
export class AskingForMoreTimeController {
  constructor(private readonly moreTime: AskingForMoreTimeService) {}

  @Get(':id/more-time')
  @ApiOperation({ summary: 'Whether this check-in ran out of time, and whether I already asked for more today' })
  async whereItStands(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.moreTime.whereItStands(id, userId);
  }

  @Post(':id/more-time')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ask the lead to give this check-in more time. Once a day.' })
  async ask(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.moreTime.ask(id, userId);
  }
}
