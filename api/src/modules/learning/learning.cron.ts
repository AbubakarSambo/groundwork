import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LearningService } from './learning.service';

/** The periodic recount. Counts are never rebuilt by reading them. */
@Injectable()
export class LearningCron {
  private readonly logger = new Logger(LearningCron.name);
  constructor(private learning: LearningService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { timeZone: 'UTC' })
  async recount() {
    await this.learning.recountEverything().catch((err) => this.logger.error(`Learning recount failed: ${err.message}`));
  }
}
