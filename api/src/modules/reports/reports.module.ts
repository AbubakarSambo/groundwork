import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ReportsListener } from './reports.listener';
import { ConversationModule } from '../conversation';
import { GroundsModule } from '../grounds';
import { EmailModule } from '../email';

@Module({
  imports: [ConversationModule, GroundsModule, EmailModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsListener],
  exports: [ReportsService],
})
export class ReportsModule {}
