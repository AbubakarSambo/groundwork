import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PatternsService } from './patterns.service';
import { CheckInStatus, GroundStatus } from '@prisma/client';

// Grounds still in motion - patterns are longitudinal across their check-ins.
const OPEN_STATUSES: GroundStatus[] = [GroundStatus.AWAITING_PARTIES, GroundStatus.REPORT_READY, GroundStatus.ACTIVE];

/**
 * Daily backstop sweep. The listener analyses each check-in as it completes;
 * this catches any completed check-in the listener missed (errors, downtime).
 * analyzeCheckIn() is idempotent via patternsAnalyzedAt.
 */
@Injectable()
export class PatternsCron {
  private readonly logger = new Logger(PatternsCron.name);

  constructor(
    private prisma: PrismaService,
    private patterns: PatternsService,
  ) {}

  // timeZone pinned to UTC - previously implicit, same fix as the two weekly
  // pattern crons in grounds.cron.ts (weeklyPeriodBoundary /
  // weeklyConcentrationRisk). This is a backstop sweep for the same
  // pattern-detection system, so it gets the same explicit pin.
  @Cron(CronExpression.EVERY_DAY_AT_2AM, { timeZone: 'UTC' })
  async sweep() {
    const pending = await this.prisma.checkIn.findMany({
      where: {
        status: CheckInStatus.COMPLETED,
        patternsAnalyzedAt: null,
        ground: { status: { in: OPEN_STATUSES } },
      },
      // Process in period order so the three-period rule sees consecutive periods.
      orderBy: [{ participantId: 'asc' }, { sessionNumber: 'asc' }],
      select: { id: true },
    });

    if (pending.length === 0) return;
    this.logger.log(`Pattern sweep: analysing ${pending.length} unprocessed check-in period(s).`);
    for (const c of pending) {
      await this.patterns.analyzeCheckIn(c.id);
    }
  }
}
