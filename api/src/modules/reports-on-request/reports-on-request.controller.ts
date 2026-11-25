import { Controller, HttpCode, Post, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { ONE_FILE } from '../../common/the-most-a-file-may-weigh';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserData } from '../../common';
import { NOTHING_TO_ADD_TO } from './the-report-on-request';
import { ReportsOnRequestService } from './reports-on-request.service';

/**
 * A FILE ADDED IN ASK FOR THE REPORT THEY ASKED FOR (S8). Read once, kept as text against their own open request, and private to them: it is
 * not a document on any check-in, and no route serves it to anybody else. Refused when they have no report waiting for documents.
 */
@ApiTags('Ask Groundwork')
@ApiBearerAuth()
@Controller('ask/report')
export class ReportsOnRequestController {
  constructor(private readonly reports: ReportsOnRequestService) {}

  @Post('material')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', ONE_FILE))
  @ApiOperation({ summary: 'Add a file to the report you asked for in Ask. It is read once and used only for your report.' })
  async material(@CurrentUser() user: CurrentUserData, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file came through, so choose a file and try again.');
    const said = await this.reports.add({ organizationId: user.organizationId, userId: user.id, via: 'ask', files: [{ name: (file.originalname ?? 'the document').trim(), mimeType: file.mimetype, bytes: file.buffer }], channel: 'chat' });
    if (!said) throw new BadRequestException(NOTHING_TO_ADD_TO);
    return { blocks: [{ type: 'text', body: said.said }], composedBy: 'rules', lane: 'report_on_request' };
  }
}
