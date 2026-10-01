import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TheWeeklyReportService } from './the-weekly-report.service';
import { CurrentUser } from '../../common';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('grounds/:groundId/report')
export class TheWeeklyReportController {
  constructor(private readonly weekly: TheWeeklyReportService) {}

  /**
   * THE WEEKLY REPORT (screens request 9, part d). Served as stored: opening it builds nothing. Whoever
   * runs the check-in reads the whole week; a person in it reads what is about them and the team's own
   * counts; an admin who only reads the check-in reads it without the lead's own list of things to do.
   */
  @Get('week')
  @ApiOperation({ summary: 'The weekly report: the week in numbers, each person, what kept happening, what changed, and what to do next week' })
  async week(
    @Param('groundId') groundId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('organizationId') organizationId: string,
    /* An earlier week, by the date of its Monday (decision 73). Omitted, the latest week. */
    @Query('week') week?: string,
  ) {
    return this.weekly.read(groundId, { userId, role, organizationId }, new Date(), week ?? null);
  }
}
