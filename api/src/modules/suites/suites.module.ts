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
import { AReviewToldOnWhatsApp } from './a-review-told-on-whatsapp.service';
import { AReviewAppealToldService } from './a-review-appeal-told.service';
import { AnAppealWaitsForANewAdmin } from './an-appeal-waits-for-a-new-admin';
import { ARequestToldOnWhatsApp } from './a-request-told-on-whatsapp.service';
import { ARequestWaitsTooLongCron } from './a-request-waits-too-long.cron';
import { SpendingForFinanceService } from './the-spending-for-finance.service';
import { ARequestFiledFromItsForm } from './a-request-filed-from-its-form';
import { ApprovalsQueueService } from './the-approvals-queue.service';
import { TheApproversSummaryCron } from './the-approvers-summary.cron';
import { DecisionsInABatchService } from './the-decisions-in-a-batch.service';

@Module({
  imports: [SuggestionsModule],
  controllers: [SuitesController],
  providers: [SuitesService, OnboardingBoardService, LeaveBoardService, TimeSheetsService, ReviewsService, LeavingBoardService, RoleMapService, SpendingService, TodosService, CustomersService, EquipmentService, CustomerStandingService, ReviewsProposedService, ReviewsProposedCron, ARequestToldOnWhatsApp, AReviewToldOnWhatsApp, AReviewAppealToldService, AnAppealWaitsForANewAdmin, ARequestWaitsTooLongCron, SpendingForFinanceService, ARequestFiledFromItsForm, ApprovalsQueueService, TheApproversSummaryCron, DecisionsInABatchService],
  exports: [SuitesService, LeaveBoardService, TimeSheetsService, ReviewsService, ReviewsProposedService, SpendingService, EquipmentService, ARequestToldOnWhatsApp, SpendingForFinanceService, ApprovalsQueueService],
})
export class SuitesModule {}
