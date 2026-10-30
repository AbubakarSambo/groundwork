import { Controller, Post, Patch, Get, Delete, Param, Query, Body, Headers, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
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

  /**
   * THE TOKEN IS A CREDENTIAL, SO IT IS NOT IN THE URL. It arrived as `?token=` and so sat in every
   * access log between the browser and this process. It is read from a header or the multipart body
   * now, and the query string is not consulted.
   */
  @Post('invite-upload')
  @ApiOperation({ summary: 'Upload a document using an invite token (no auth required). Token in the x-invite-token header or the `token` form field.' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadByToken(
    @Headers('x-invite-token') headerToken: string | undefined,
    @Body() body: { token?: string } | undefined,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const token = (headerToken ?? body?.token ?? '').trim();
    if (!token) throw new BadRequestException('An invite token is required, in the x-invite-token header or the token field.');
    return this.docs.uploadByInviteToken(token, file);
  }
}

/** A file read for the person signed in, during setup, before a check-in exists. Nothing is stored. */
@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents/read')
export class SetupDocumentsController {
  constructor(private readonly docs: DocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Read a file (PDF, Word, Excel, PowerPoint, photo or text) during setup and give back its text. Nothing is stored.' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  read(@UploadedFile() file: Express.Multer.File) {
    return this.docs.readForSetup(file);
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
    @Body() body: { consentConfirmed?: string | boolean; uploaderNote?: string; fromTheCheckIn?: string | boolean },
  ) {
    /* Multipart, so it arrives as the string "true" rather than a boolean. */
    const confirmed = body?.consentConfirmed === true || body?.consentConfirmed === 'true';
    /* Release 1B: added in the person's own check-in, so it may be filed as evidence on its item (proof-filed-on-its-item.ts). */
    const fromTheCheckIn = body?.fromTheCheckIn === true || body?.fromTheCheckIn === 'true';
    return this.docs.upload(groundId, userId, file, confirmed, body?.uploaderNote, fromTheCheckIn ? { fromTheCheckIn: true } : {});
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

  /**
   * G38: open context and private context, named and switchable.
   *
   * Only the uploader may move a document, and only the lead may move one to CLOSED -
   * see setVisibility for why both of those are deliberate.
   */
  @Patch(':docId/visibility')
  @ApiOperation({ summary: 'Move your own document between open and private' })
  setVisibility(
    @Param('groundId') groundId: string,
    @Param('docId') docId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { visibility: 'OPEN' | 'OWN' | 'CLOSED' },
  ) {
    return this.docs.setVisibility(groundId, docId, userId, dto.visibility);
  }

  @Patch(':docId/note')
  @ApiOperation({ summary: 'Say what your own document should be used for. Blank clears it.' })
  setNote(
    @Param('groundId') groundId: string,
    @Param('docId') docId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { note?: string | null },
  ) {
    return this.docs.setNote(groundId, docId, userId, dto?.note);
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
