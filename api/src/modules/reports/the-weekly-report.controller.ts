import { Controller, Get, Param, Query, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { theWeekForTheLead } from '../email/the-leads-weekly-letter';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TheWeeklyReportService } from './the-weekly-report.service';
import { CurrentUser } from '../../common';
import { theWeeklyReportAtAGlance, withItsFacts } from './a-report-at-a-glance';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('grounds/:groundId/report')
export class TheWeeklyReportController {
  constructor(private readonly weekly: TheWeeklyReportService, @Optional() private readonly prisma?: PrismaService, @Optional() private readonly moduleRef?: ModuleRef) {}

  /**
   * THE WEEK FOR THE LEAD, ON THE SCREEN (browser test, 21 October 2026): the same three parts the weekly letter carries since #396, where
   * the target stands, what moved this week with what shows it, and who needs the lead with the evidence, read by the same function
   * (theWeekForTheLead). Only where the direct morning is on, only for the person who runs the check-in (the people's records are the
   * lead's to read, as in the letter), and only for the latest week; otherwise nothing is added and the report is served as before.
   */
  private async forTheLead(groundId: string, userId: string, week: string | null): Promise<{ target: string | null; movedWithProof: string[]; needsYou: { says: string; evidence: string[] }[] } | null> {
    if (!this.prisma || week) return null;
    const g = await (this.prisma as any).ground.findUnique({ where: { id: groundId }, select: { id: true, label: true, initiatorId: true } }).catch(() => null);
    if (!g || g.initiatorId !== userId) return null;
    let board: { get(groundId: string, userId: string): Promise<any> } | undefined;
    try { const { BoardService } = await import('../board/board.service'); const b: any = this.moduleRef?.get(BoardService, { strict: false }); if (b) board = { get: (x, y) => b.get(x, y) }; } catch { board = undefined; }
    const w = await theWeekForTheLead(this.prisma, g, new Date(), board).catch(() => ({} as Awaited<ReturnType<typeof theWeekForTheLead>>));
    if (!w.theTarget && !(w.movedWithProof ?? []).length && !(w.needsYou ?? []).length) return null;
    return { target: w.theTarget ?? null, movedWithProof: w.movedWithProof ?? [], needsYou: w.needsYou ?? [] };
  }

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
    const lead = served ? await this.forTheLead(groundId, userId, week ?? null) : null;
    const said = withItsFacts(served, theWeeklyReportAtAGlance);
    return lead && said && typeof said === 'object' ? { ...(said as object), forTheLead: lead } : said;
  }
}
