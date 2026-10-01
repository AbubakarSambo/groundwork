import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { CurrentUser, CurrentUserData, Roles, Role } from '../../common';
import { LearningService } from './learning.service';

@ApiTags('Learning')
@ApiBearerAuth()
@Controller('learning')
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  /** Groundwork's own platform admin: the total across organisations, with no organisation named. */
  @Get('platform')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: 'How well each pattern, coaching step and question is working, in total' })
  async total(@CurrentUser() user: CurrentUserData) {
    return { rows: await this.learning.readFor({ isPlatformAdmin: true, organizationId: user.organizationId }) };
  }

  /** An organisation's own admin: only their own organisation's counts. */
  @Get('mine')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: "Your own organisation's counts of how well each pattern, step and question is working" })
  async mine(@CurrentUser() user: CurrentUserData) {
    return { rows: await this.learning.readFor({ isPlatformAdmin: false, organizationId: user.organizationId }) };
  }
}
