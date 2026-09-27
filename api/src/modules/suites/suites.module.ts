import { Module } from '@nestjs/common';
import { SuitesService } from './suites.service';
import { SuitesController } from './suites.controller';
import { OnboardingBoardService } from './the-onboarding-board.service';
import { LeaveBoardService } from './the-leave-board.service';
import { TimeSheetsService } from './the-time-sheets.service';
import { ReviewsService } from './the-reviews.service';
import { LeavingBoardService } from './the-leaving-board.service';

@Module({
  controllers: [SuitesController],
  providers: [SuitesService, OnboardingBoardService, LeaveBoardService, TimeSheetsService, ReviewsService, LeavingBoardService],
  exports: [SuitesService, LeaveBoardService, TimeSheetsService, ReviewsService],
})
export class SuitesModule {}
