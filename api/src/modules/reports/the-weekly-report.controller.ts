import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TheWeeklyReportService } from './the-weekly-report.service';
import { CurrentUser } from '../../common';
import { theWeeklyReportAtAGlance, withItsFacts } from './a-report-at-a-glance';

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
    const served = await this.weekly.read(groundId, { userId, role, organizationId }, new Date(), week ?? null);
    /* Change 6 (decision 133): the lead's reading of the week served is recorded, after the read was allowed. Never a rebuild. */
    await this.weekly.noteTheLeadRead(groundId, served?.weekStart ?? null, userId);
    /* The light report's one fact for each folded line (sales-first.md, section 2, rule 3), from the week as this reader is served it. */
    return withItsFacts(served, theWeeklyReportAtAGlance);
  }
}
