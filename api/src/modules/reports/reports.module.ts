import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ReportsListener } from './reports.listener';
import { TheBlockerTraceController } from './the-blocker-trace.controller';
import { TheBlockerTraceService } from './the-blocker-trace.service';
import { TheWeeklyReportController } from './the-weekly-report.controller';
import { TheWeeklyReportService } from './the-weekly-report.service';
import { ConversationModule } from '../conversation';
import { GroundsModule } from '../grounds';
import { EmailModule } from '../email';
import { UsageModule } from '../usage/usage.module';
import { WorkspaceModule } from '../workspace/workspace.module';

@Module({
  imports: [ConversationModule, GroundsModule, EmailModule, UsageModule, WorkspaceModule],
  controllers: [ReportsController, TheBlockerTraceController, TheWeeklyReportController],
  providers: [ReportsService, ReportsListener, TheBlockerTraceService, TheWeeklyReportService],
  exports: [ReportsService],
})
export class ReportsModule {}
