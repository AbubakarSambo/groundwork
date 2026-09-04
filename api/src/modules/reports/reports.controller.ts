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

  /**
   * WHAT THIS REPORT SAID AT THE END OF EACH ROUND.
   *
   * The report at the top of the page is always the current one. This is what it said when each
   * round closed, kept so a picture somebody read at day 14 is still there at day 90 - and so a
   * ninety-day account can be read back from the record instead of re-derived from transcripts.
   *
   * Same permission as the report itself: it is the same content at an earlier moment, so anybody
   * entitled to read the report is entitled to read what it used to say, and nobody else is.
   */
  @Get('rounds')
  @ApiOperation({ summary: 'What the report said at the end of each completed round' })
  async rounds(
    @Param('groundId') groundId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.reports.rounds(groundId, userId, organizationId);
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
  @ApiOperation({ summary: 'Participant shows their report to the others (takes effect when everyone has)' })
  async activate(@Param('groundId') groundId: string, @CurrentUser('id') userId: string) {
    return this.reports.activate(groundId, userId);
  }

  @Get('activation-status')
  @ApiOperation({ summary: 'Check which participants have shown theirs' })
  async activationStatus(@Param('groundId') groundId: string, @CurrentUser('id') userId: string) {
    return this.reports.getActivationStatusForUser(groundId, userId);
  }
}
