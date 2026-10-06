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
import { EquipmentService } from './the-equipment.service';
import { CustomerStandingService } from './the-customer-standing.service';
import { ReviewsProposedService } from './the-reviews-proposed.service';
import { ReviewsProposedCron } from './the-reviews-proposed.cron';
import { SuggestionsModule } from '../suggestions/suggestions.module';
import { AnthropicService } from '../conversation/anthropic.service';
import { AReviewToldOnWhatsApp } from './a-review-told-on-whatsapp.service';
import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';
import { ARequestWaitsTooLongCron } from './a-request-waits-too-long.cron';
import { SpendingForFinanceService } from './the-spending-for-finance.service';
import { ARequestFiledFromItsForm } from './a-request-filed-from-its-form';

@Module({
  imports: [SuggestionsModule],
  controllers: [SuitesController],
  providers: [SuitesService, OnboardingBoardService, LeaveBoardService, TimeSheetsService, ReviewsService, LeavingBoardService, RoleMapService, SpendingService, TodosService, CustomersService, EquipmentService, CustomerStandingService, AnthropicService, ReviewsProposedService, ReviewsProposedCron, ARequestToldOnWhatsApp, AReviewToldOnWhatsApp, ARequestWaitsTooLongCron, SpendingForFinanceService, ARequestFiledFromItsForm],
  exports: [SuitesService, LeaveBoardService, TimeSheetsService, ReviewsService, ReviewsProposedService, SpendingService, EquipmentService, ARequestToldOnWhatsApp, SpendingForFinanceService],
})
export class SuitesModule {}
