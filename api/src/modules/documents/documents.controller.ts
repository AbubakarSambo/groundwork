import { Controller, Post, Patch, Get, Delete, Param, Query, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';
import { DocumentsService } from './documents.service';
import { CurrentUser } from '../../common';

class CorrectAssessmentDto {
  @IsArray() @IsString({ each: true }) suggests: string[];
  @IsArray() @IsString({ each: true }) willDo: string[];
}
import { Public } from '../../common';

@ApiTags('Documents')
@Public()
@Controller('documents')
export class InviteDocumentsController {
  constructor(private readonly docs: DocumentsService) {}

  @Post('invite-upload')
  @ApiOperation({ summary: 'Upload a document using an invite token (no auth required)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadByToken(
    @Query('token') token: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.docs.uploadByInviteToken(token, file);
  }
}

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

  @Patch(':docId/assessment')
  @ApiOperation({ summary: "Correct a document's assessment" })
  correctAssessment(
    @Param('groundId') groundId: string,
    @Param('docId') docId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CorrectAssessmentDto,
  ) {
    return this.docs.correctAssessment(groundId, docId, userId, dto);
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
