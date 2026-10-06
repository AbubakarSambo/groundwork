import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { onceAcrossCopies, theDay } from '../prisma/once-across-copies';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LearningService } from './learning.service';

/** The periodic recount. Counts are never rebuilt by reading them. */
@Injectable()
export class LearningCron {
  private readonly logger = new Logger(LearningCron.name);
  constructor(
    private learning: LearningService,
    /* Last and optional, so a spec that builds this with one argument keeps working. */
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { timeZone: 'UTC' })
  async recount() {
    /* Once a day across every copy of the API (decision 74, item 7). */
    await onceAcrossCopies(this.prisma, 'learning-recount', theDay(), () =>
      this.learning.recountEverything().catch((err) => this.logger.error(`Learning recount failed: ${err.message}`)));
  }
}
