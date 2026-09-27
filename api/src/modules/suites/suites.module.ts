import { Module } from '@nestjs/common';
import { SuitesService } from './suites.service';
import { SuitesController } from './suites.controller';
import { OnboardingBoardService } from './the-onboarding-board.service';
import { LeaveBoardService } from './the-leave-board.service';
import { TimeSheetsService } from './the-time-sheets.service';
import { ReviewsService } from './the-reviews.service';
import { LeavingBoardService } from './the-leaving-board.service';
import { RoleMapService } from './the-role-map.service';
import { SpendingService } from './the-spending.service';
import { TodosService } from './the-todos.service';
import { CustomersService } from './the-customers.service';

@Module({
  controllers: [SuitesController],
  providers: [SuitesService, OnboardingBoardService, LeaveBoardService, TimeSheetsService, ReviewsService, LeavingBoardService, RoleMapService, SpendingService, TodosService, CustomersService],
  exports: [SuitesService, LeaveBoardService, TimeSheetsService, ReviewsService, SpendingService],
})
export class SuitesModule {}
