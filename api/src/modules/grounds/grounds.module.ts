import { Module, forwardRef } from '@nestjs/common';
import { GroundsService } from './grounds.service';
import { GroundsController } from './grounds.controller';
import { GroundsCron } from './grounds.cron';
import { AskingForMoreTimeService } from './asking-for-more-time.service';
import { AskingForMoreTimeController } from './asking-for-more-time.controller';
import { ParticipantRequestsController } from './participant-requests.controller';
import { TodayController } from './today.controller';
import { WhatNeedsYouService } from './what-needs-you.service';
import { YouController } from './you.controller';
import { YourBoardService } from './your-board.service';
import { CheckInLinksController } from './check-in-links.controller';
import { CheckInLinksService } from './check-in-links.service';
import { CompanyController } from './company.controller';
import { DirectionController } from '../direction/direction.controller';
import { DirectionService } from '../direction/direction.service';
import { CompanyService } from './company.service';
import { CompanyPictureService } from './the-company-picture.service';
import { APlanIsManyProposalsService } from './a-plan-is-many-proposals.service';
import { RecommendedCheckInsController } from './recommended-check-ins.controller';
import { RecommendedCheckInsService } from './recommended-check-ins.service';
import { BillingModule } from '../billing';
import { PatternsModule } from '../patterns/patterns.module';
import { UsageModule } from '../usage/usage.module';
import { ConversationModule } from '../conversation/conversation.module';
import { SuggestionsModule } from '../suggestions/suggestions.module';
import { SuitesModule } from '../suites/suites.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  /**
   * ConversationModule is here for `GET :id/my-transcript`, which is a
   * ground-scoped read served by ConversationService.
   *
   * Missing it compiled clean and passed 1494 tests, and the app would not boot:
   * "Nest can't resolve dependencies of the GroundsController". Module wiring is
   * invisible to tsc and to unit tests that construct services by hand - only
   * starting the thing finds it.
   */
  /* KnowledgeModule and DocumentsModule for the Desk (S7): a document added there is read and kept the one way every document is. */
  imports: [BillingModule, PatternsModule, UsageModule, ConversationModule, SuggestionsModule, SuitesModule, KnowledgeModule, forwardRef(() => DocumentsModule)],
  controllers: [GroundsController, ParticipantRequestsController, AskingForMoreTimeController, TodayController, YouController, CompanyController, DirectionController, CheckInLinksController, RecommendedCheckInsController],
  providers: [GroundsService, GroundsCron, AskingForMoreTimeService, WhatNeedsYouService, YourBoardService, CompanyService, DirectionService, CompanyPictureService, CheckInLinksService, APlanIsManyProposalsService, RecommendedCheckInsService],
  exports: [GroundsService, WhatNeedsYouService],
})
export class GroundsModule {}
