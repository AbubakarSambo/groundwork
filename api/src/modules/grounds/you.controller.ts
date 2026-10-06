import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserData } from '../../common';
import { YourBoardService } from './your-board.service';

/**
 * THE YOU BOARD (C2, U.12): what is yours, across your check-ins. Only you may read it.
 *
 * `GET /you` reads the signed-in person's own board. Naming anybody else, as `GET /you/:userId` or
 * with `?userId=`, is refused: there is no way for a lead, an admin or a colleague to read somebody
 * else's, whatever their role.
 */
@ApiTags('You')
@ApiBearerAuth()
@Controller('you')
export class YouController {
  constructor(private readonly board: YourBoardService) {}

  private reader(user: CurrentUserData) {
    return { userId: user.id, email: user.email, organizationId: user.organizationId, role: user.role };
  }

  @Get()
  @ApiOperation({ summary: 'Your own board, across your check-ins. Only you may read it.' })
  async mine(@CurrentUser() user: CurrentUserData, @Query('userId') userId?: string) {
    return this.board.forReader(this.reader(user), userId ?? null);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Refused for anybody but the person themselves.' })
  async someone(@CurrentUser() user: CurrentUserData, @Param('userId') userId: string) {
    return this.board.forReader(this.reader(user), userId);
  }
}
