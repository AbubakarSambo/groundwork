import { Module, forwardRef } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { ConversationModule } from '../conversation';

@Module({
  imports: [forwardRef(() => ConversationModule)],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
