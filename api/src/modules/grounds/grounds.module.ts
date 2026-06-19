import { Module } from '@nestjs/common';
import { GroundsService } from './grounds.service';
import { GroundsController } from './grounds.controller';
import { GroundsCron } from './grounds.cron';
import { ParticipantRequestsController } from './participant-requests.controller';
import { BillingModule } from '../billing';
import { PatternsModule } from '../patterns/patterns.module';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [BillingModule, PatternsModule, UsageModule],
  controllers: [GroundsController, ParticipantRequestsController],
  providers: [GroundsService, GroundsCron],
  exports: [GroundsService],
})
export class GroundsModule {}
