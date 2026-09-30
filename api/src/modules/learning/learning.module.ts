import { Module } from '@nestjs/common';
import { LearningService } from './learning.service';
import { LearningCron } from './learning.cron';
import { LearningController } from './learning.controller';

@Module({
  controllers: [LearningController],
  providers: [LearningService, LearningCron],
  exports: [LearningService],
})
export class LearningModule {}
