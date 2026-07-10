import { Controller, Get, Post, Param, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CurrentUser, Roles, Role } from '../../common';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('grounds/:groundId/report')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  @ApiOperation({ summary: 'Get the released report (party or org admin)' })
  async get(
    @Param('groundId') groundId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.reports.get(groundId, userId, organizationId);
  }

  @Post('generate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Manually trigger or retry report synthesis (admin only)' })
  async generate(@Param('groundId') groundId: string, @CurrentUser('organizationId') organizationId: string) {
    return this.reports.generateForAdmin(groundId, organizationId);
  }

  @Post('release')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Release the report to both parties simultaneously' })
  async release(@Param('groundId') groundId: string, @CurrentUser('organizationId') organizationId: string) {
    return this.reports.release(groundId, organizationId);
  }

  @Post('activate')
  @ApiOperation({ summary: 'Participant confirms they are ready to see the report (mutual reveal gate)' })
  async activate(@Param('groundId') groundId: string, @CurrentUser('id') userId: string) {
    return this.reports.activate(groundId, userId);
  }

  @Get('activation-status')
  @ApiOperation({ summary: 'Check which parties have activated their report view' })
  async activationStatus(@Param('groundId') groundId: string, @CurrentUser('id') userId: string) {
    return this.reports.getActivationStatusForUser(groundId, userId);
  }
}
