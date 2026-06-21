import { Module } from '@nestjs/common';
import { EntryController, EntryCommitController } from './entry.controller';
import { EntryService } from './entry.service';
import { ConversationModule } from '../conversation/conversation.module';
import { GroundsModule } from '../grounds/grounds.module';

@Module({
  imports: [ConversationModule, GroundsModule],
  controllers: [EntryController, EntryCommitController],
  providers: [EntryService],
})
export class EntryModule {}
