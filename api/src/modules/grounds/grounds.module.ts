import { Module } from '@nestjs/common';
import { GroundsService } from './grounds.service';
import { GroundsController } from './grounds.controller';
import { GroundsCron } from './grounds.cron';
import { BillingModule } from '../billing';
import { PatternsModule } from '../patterns/patterns.module';

@Module({
  imports: [BillingModule, PatternsModule],
  controllers: [GroundsController],
  providers: [GroundsService, GroundsCron],
  exports: [GroundsService],
})
export class GroundsModule {}
