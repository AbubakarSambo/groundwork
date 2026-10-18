import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { onceAcrossCopies } from '../prisma/once-across-copies';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';

/**
 * EVERY QUARTER HOUR, THE REPORTS WHOSE TIME HAS COME SHARE THEMSELVES (Hafsah's answers 1 and 5, 16 October 2026).
 * The work is ReportsService.shareTheReportsWhoseTimeHasCome; this only runs it, once per quarter hour across every
 * copy of the API. In a cron file for the reason reviews-coming-up.cron.ts gives.
 */
@Injectable()
export class AReportSharesItselfCron {
  constructor(private readonly prisma: PrismaService, private readonly reports: ReportsService) {}

  @Cron('*/15 * * * *', { timeZone: 'UTC' })
  async shareTheReportsWhoseTimeHasCome() {
    const now = new Date();
    const slot = new Date(Math.floor(now.getTime() / (15 * 60 * 1000)) * 15 * 60 * 1000).toISOString();
    await onceAcrossCopies(this.prisma, 'a-report-shares-itself', slot, () => this.reports.shareTheReportsWhoseTimeHasCome(now));
  }
}
