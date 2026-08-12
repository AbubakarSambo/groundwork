import { Module } from '@nestjs/common';
import { GroundsService } from './grounds.service';
import { GroundsController } from './grounds.controller';
import { GroundsCron } from './grounds.cron';
import { ParticipantRequestsController } from './participant-requests.controller';
import { BillingModule } from '../billing';
import { PatternsModule } from '../patterns/patterns.module';
import { UsageModule } from '../usage/usage.module';
import { ConversationModule } from '../conversation/conversation.module';

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
  imports: [BillingModule, PatternsModule, UsageModule, ConversationModule],
  controllers: [GroundsController, ParticipantRequestsController],
  providers: [GroundsService, GroundsCron],
  exports: [GroundsService],
})
export class GroundsModule {}
