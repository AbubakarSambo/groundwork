import { Module } from '@nestjs/common';
import { GroundsService } from './grounds.service';
import { GroundsController } from './grounds.controller';
import { GroundsCron } from './grounds.cron';
import { BillingModule } from '../billing';

@Module({
  imports: [BillingModule],
  controllers: [GroundsController],
  providers: [GroundsService, GroundsCron],
  exports: [GroundsService],
})
export class GroundsModule {}
