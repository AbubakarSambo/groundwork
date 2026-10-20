import { Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common';
import { TheLeadsOwnNudgeService } from '../engagement/the-leads-own-nudge';

/**
 * "NUDGE PETER" (engagement/the-leads-own-nudge.ts). POST /grounds/:id/board/nudge/:participantId. The lead who runs the check-in only:
 * anybody else is refused on the server (403), whatever the screen draws.
 */
@ApiTags('board')
@ApiBearerAuth()
@Controller('grounds/:id/board/nudge')
export class TheLeadsOwnNudgeController {
  constructor(private nudges: TheLeadsOwnNudgeService) {}

  @Post(':participantId')
  @ApiOperation({ summary: 'The lead nudges one team member who has not answered today: one message from her by name, at most once a day.' })
  async nudge(@Param('id') id: string, @Param('participantId') participantId: string, @CurrentUser('id') userId: string) {
    return this.nudges.nudge(id, participantId, userId);
  }
}
