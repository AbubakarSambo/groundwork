import { Controller, Post, Get, Delete, Param, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CurrentUser } from '../../common';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('grounds/:groundId/documents')
export class DocumentsController {
  constructor(private readonly docs: DocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Upload a document (PDF or TXT) for this ground' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(
    @Param('groundId') groundId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    return this.docs.upload(groundId, userId, file);
  }

  @Get()
  @ApiOperation({ summary: 'List documents uploaded by this party' })
  list(@Param('groundId') groundId: string, @CurrentUser('id') userId: string) {
    return this.docs.list(groundId, userId);
  }

  @Delete(':docId')
  @ApiOperation({ summary: 'Delete a document' })
  remove(
    @Param('groundId') groundId: string,
    @Param('docId') docId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.docs.remove(groundId, docId, userId);
  }
}
