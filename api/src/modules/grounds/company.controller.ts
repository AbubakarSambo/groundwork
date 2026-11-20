import { Body, Controller, ForbiddenException, Get, HttpCode, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserData } from '../../common';
import { CompanyService } from './company.service';

/**
 * THE DESK (S7, the company page renamed, D2, U.15): the organisation's documents with their kept
 * summaries, its directory, and its priorities and the check-ins that feed them, as this reader may
 * read them. Everybody in the organisation may ask; a guest from another company is served a plain
 * sentence and nothing else. What each reader is given is decided in CompanyService, never on the screen.
 */
@ApiTags('Company')
@ApiBearerAuth()
@Controller('company')
export class CompanyController {
  constructor(private readonly company: CompanyService) {}

  @Get()
  @ApiOperation({ summary: 'The company page: priorities and what feeds them, as you may read them.' })
  async page(@CurrentUser() user: CurrentUserData) {
    try {
      return await this.company.forReader({ userId: user.id, email: user.email, organizationId: user.organizationId, role: user.role });
    } catch (err) {
      /* Somebody who does not work here reads a plain page, not an error (S7). */
      if (err instanceof ForbiddenException) return this.company.forSomebodyRefused(user.organizationId);
      throw err;
    }
  }

  @Get('documents/:key')
  @ApiOperation({ summary: 'One document on the Desk, in full, for anybody who works in the organisation.' })
  async document(@CurrentUser() user: CurrentUserData, @Param('key') key: string) {
    return this.company.aDocument({ userId: user.id, organizationId: user.organizationId, role: user.role }, key);
  }

  @Post('documents')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'An admin or a lead adds a document to the Desk, as a file or pasted text. It is read and summarised, and kept.' })
  async addADocument(@CurrentUser() user: CurrentUserData, @UploadedFile() file: Express.Multer.File, @Body() body: { title?: string; text?: string }) {
    return this.company.addADocument({ userId: user.id, organizationId: user.organizationId, role: user.role }, { file, title: body?.title, text: body?.text });
  }
}
