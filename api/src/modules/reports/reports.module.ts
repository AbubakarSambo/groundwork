import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ReportsListener } from './reports.listener';
import { ConversationModule } from '../conversation';
import { GroundsModule } from '../grounds';

@Module({
  imports: [ConversationModule, GroundsModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsListener],
  exports: [ReportsService],
})
export class ReportsModule {}
