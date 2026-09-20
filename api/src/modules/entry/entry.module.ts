import { Module } from '@nestjs/common';
import { EntryController, EntryCommitController } from './entry.controller';
import { EntryService } from './entry.service';
import { EntryCron } from './entry.cron';
import { TheOpenLinkService } from './the-open-link.service';
import { ConversationModule } from '../conversation/conversation.module';
import { GroundsModule } from '../grounds/grounds.module';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [ConversationModule, GroundsModule, AuthModule, EmailModule],
  controllers: [EntryController, EntryCommitController],
  providers: [EntryService, EntryCron, TheOpenLinkService],
})
export class EntryModule {}
