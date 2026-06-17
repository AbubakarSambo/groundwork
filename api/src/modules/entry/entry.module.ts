import { Module } from '@nestjs/common';
import { EntryController } from './entry.controller';
import { EntryService } from './entry.service';
import { ConversationModule } from '../conversation';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [ConversationModule, DocumentsModule],
  controllers: [EntryController],
  providers: [EntryService],
})
export class EntryModule {}
