import { Module, forwardRef } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController, InviteDocumentsController } from './documents.controller';
import { ConversationModule } from '../conversation';

@Module({
  imports: [forwardRef(() => ConversationModule)],
  controllers: [InviteDocumentsController, DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
