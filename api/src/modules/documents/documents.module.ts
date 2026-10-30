import { Module, forwardRef } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController, InviteDocumentsController, SetupDocumentsController } from './documents.controller';
import { ConversationModule } from '../conversation';
import { AlignmentModule } from '../alignment/alignment.module';

@Module({
  imports: [forwardRef(() => ConversationModule), AlignmentModule],
  controllers: [InviteDocumentsController, SetupDocumentsController, DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
