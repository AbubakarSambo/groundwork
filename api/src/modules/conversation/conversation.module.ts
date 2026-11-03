import { Module, forwardRef } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController, ClarificationController } from './conversation.controller';
import { AnthropicService } from './anthropic.service';
import { ConversationContextService } from './context.service';
import { RemindService } from './remind.service';
import { StopRemindersController } from './stop-reminders.controller';
import { BillingModule } from '../billing';
import { DocumentsModule } from '../documents/documents.module';
import { UsageModule } from '../usage/usage.module';
import { EmailModule } from '../email/email.module';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { TheOwedWritesCron } from './the-owed-writes.cron';
import { AComplaintIsToldListener } from './a-complaint-is-told.listener';
import { WorkspaceModule } from '../workspace/workspace.module';

@Module({
  /* WorkspaceModule: the lead digest now also posts "people have a check-in waiting" to a
     connected channel — see remind.service.ts. */
  imports: [BillingModule, forwardRef(() => DocumentsModule), UsageModule, EmailModule, WorkspaceModule],
  controllers: [ConversationController, ClarificationController, StopRemindersController],
  /*
   * `KnowledgeService` is a provider rather than an imported module because it has none - it is
   * registered directly wherever it is used, the same way the public API does it.
   */
  providers: [ConversationService, AnthropicService, ConversationContextService, RemindService, KnowledgeService, TheOwedWritesCron, AComplaintIsToldListener],
  exports: [ConversationService, AnthropicService],
})
export class ConversationModule {}
