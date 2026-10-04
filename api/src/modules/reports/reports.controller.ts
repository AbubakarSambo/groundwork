import { Controller, Get, Post, Param, Body, NotFoundException, ForbiddenException, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { releasedSessionsOf, whatReleasingThisSessionDoes } from './each-sessions-picture-is-released-on-its-own';

/** The sessions now released, the one this release shared, and the sentence that says so. */
function whatWasReleased(report: { releasedSessions?: number[] | null } | null) {
  const releasedSessions = releasedSessionsOf(report) ?? [];
  const sessionNumber = releasedSessions.length ? releasedSessions[releasedSessions.length - 1] : null;
  return { releasedSessions, sessionNumber, saying: sessionNumber ? whatReleasingThisSessionDoes(sessionNumber) : null };
}
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

  /**
   * ONE SESSION'S REPORT, in the shape the site promises per check-in: where things stand,
   * progress and priorities, commitments, risks and concerns, asks, what changed since last
   * session, what changed since the beginning, what it rests on, how clear the accounts were,
   * and the conversation worth having.
   */
  @Get('session/:sessionNumber')
  @ApiOperation({ summary: "One session's report, in the promised shape" })
  async sessionReport(
    @Param('groundId') groundId: string,
    @Param('sessionNumber', ParseIntPipe) sessionNumber: number,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.reports.sessionReport(groundId, sessionNumber, userId, organizationId);
  }

  /**
   * The success statement, the conditions under it, and where the accounts put each one. Its own
   * route because a party's record and the board show it without a session in hand.
   */
  @Get('against-success')
  @ApiOperation({ summary: 'What success was said to be, and where the accounts put each condition' })
  async againstSuccess(
    @Param('groundId') groundId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.reports.whereAgainstSuccess(groundId, userId, organizationId);
  }

  @Post('generate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Manually trigger or retry report synthesis (admin only)' })
  async generate(@Param('groundId') groundId: string, @CurrentUser('id') userId: string, @CurrentUser('organizationId') organizationId: string) {
    return this.reports.generateForAdmin(groundId, organizationId, userId);
  }

  /* No role gate here. The person who runs a check-in may be a member with "Can open check-ins", and the
     service already refuses everybody but the lead (and an admin where the lead has left): decision 76. */
  @Post('release')
  @ApiOperation({ summary: "Release the team's picture of the current session to everyone in the check-in" })
  async release(
    @Param('groundId') groundId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    /* THE STORED ROW NEVER GOES BACK OVER THE WIRE. This returned the raw report: every person's
       ratings, every private guide and the concern flags, to any admin who pressed Release. Hafsah,
       28 September 2026: leads and admins are never sent how anyone's answers were rated. The
       screen only refreshes after this; it reads the report through GET, which filters it. */
    /* Only the person who runs the check-in shares its report (request 57); another admin is refused. */
    const released = await this.reports.releaseAsTheLead(groundId, userId, organizationId);
    /* Each session's picture is released on its own (decision 76, item 4), and the lead is told
       plainly which one went: "This shares the team's picture of session 2 with everyone in the
       check-in." */
    return { groundId, releasedAt: (released as any)?.releasedAt ?? null, ...whatWasReleased(released as any) };
  }

  /**
   * THE PLACE TO SEND THE REPORT TO EVERYONE, AT THE END. Hafsah, 22 Sep 2026: "I need a place to
   * release the report to everyone at the end." Whoever runs the check-in presses it: the report is
   * synthesised and released if it is not yet, and everybody who answered and asked for it gets the
   * link to this round's report, once. Pressing it again sends to anyone who answered since.
   */
  @Post('send-to-everyone')
  @ApiOperation({ summary: 'Send this round\'s report to everyone who answered and asked for it, named or anonymised' })
  async sendToEveryone(
    @Param('groundId') groundId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
    /* The organiser's answer, not the product's. Absent means named, which is what it did before
       this choice existed - a silent change to anonymised would be the product deciding. */
    @Body() body: { as?: string },
  ) {
    return this.reports.sendToEveryone(groundId, userId, organizationId, body?.as === 'ANONYMOUS' ? 'ANONYMOUS' : 'NAMED');
  }

  @Post('activate')
  @ApiOperation({ summary: 'Participant shows their report to the others (takes effect when everyone has)' })
  async activate(@Param('groundId') groundId: string, @CurrentUser('id') userId: string) {
    return this.reports.activate(groundId, userId);
  }

  @Get('activation-status')
  @ApiOperation({ summary: 'Check which participants have shown theirs' })
  async activationStatus(
    @Param('groundId') groundId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.reports.getActivationStatusForUser(groundId, userId, organizationId);
  }
}
