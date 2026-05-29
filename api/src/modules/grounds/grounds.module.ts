import { Module } from '@nestjs/common';
import { GroundsService } from './grounds.service';
import { GroundsController } from './grounds.controller';
import { BillingModule } from '../billing';

@Module({
  imports: [BillingModule],
  controllers: [GroundsController],
  providers: [GroundsService],
  exports: [GroundsService],
})
export class GroundsModule {}
