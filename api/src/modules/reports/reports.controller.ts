import { Controller, Get, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CurrentUser, Roles, Role } from '../../common';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('grounds/:groundId/report')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  @ApiOperation({ summary: 'Get the released report (party only)' })
  async get(@Param('groundId') groundId: string, @CurrentUser('id') userId: string) {
    return this.reports.get(groundId, userId);
  }

  @Post('release')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Release the report to both parties simultaneously' })
  async release(@Param('groundId') groundId: string, @CurrentUser('organizationId') organizationId: string) {
    return this.reports.release(groundId, organizationId);
  }
}
