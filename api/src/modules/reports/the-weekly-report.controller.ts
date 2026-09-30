import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TheWeeklyReportService } from './the-weekly-report.service';
import { CurrentUser } from '../../common';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('grounds/:groundId/report')
export class TheWeeklyReportController {
  constructor(private readonly weekly: TheWeeklyReportService) {}

  /**
   * THE WEEKLY REPORT'S SENTENCE ABOUT EACH PERSON (screens request 9, part d). Served as stored: opening
   * it builds nothing. Whoever runs the check-in reads every sentence; a person in it reads only their own.
   */
  @Get('week')
  @ApiOperation({ summary: 'What this week shows about each person, in one plain sentence each' })
  async week(
    @Param('groundId') groundId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.weekly.read(groundId, { userId, role, organizationId });
  }
}
