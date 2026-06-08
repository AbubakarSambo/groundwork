import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { GroundStatus } from '@prisma/client';

const TERMINAL: GroundStatus[] = [GroundStatus.RESOLVED, GroundStatus.CLOSED, GroundStatus.STALLED];

@Injectable()
export class GroundsCron {
  private readonly logger = new Logger(GroundsCron.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Daily sweep: transition any ground past its timelineDays to STALLED.
   * Billing stops automatically because the monthly cron only queries ACTIVE grounds.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async stallOverdueGrounds() {
    const candidates = await this.prisma.ground.findMany({
      where: { status: { notIn: TERMINAL } },
      select: { id: true, createdAt: true, timelineDays: true },
    });

    const staleIds = candidates
      .filter((g) => {
        const deadline = new Date(g.createdAt.getTime() + g.timelineDays * 24 * 60 * 60 * 1000);
        return deadline < new Date();
      })
      .map((g) => g.id);

    if (staleIds.length === 0) return;

    await this.prisma.ground.updateMany({
      where: { id: { in: staleIds } },
      data: { status: GroundStatus.STALLED },
    });

    this.logger.warn(`Stalled ${staleIds.length} overdue ground(s): ${staleIds.join(', ')}`);
  }
}
