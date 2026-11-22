import { Body, Controller, Get, HttpStatus, Param, Post, Put, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser, CurrentUserData } from '../../common';
import { PersonDetailsService, type EmergencyContactIn } from './person-details.service';
import { MOST_A_CV_MAY_WEIGH } from './who-reads-a-persons-details';

/**
 * A PERSON'S CV AND EMERGENCY CONTACT (Hafsah, 21 November 2026). Not admin-only by decorator: the person reads and changes
 * their own, and the rule in who-reads-a-persons-details.ts decides each request. The upload takes a file the way the Desk's
 * own upload does (one `file` field, 10 MB at most).
 */
@ApiTags('Users')
@ApiBearerAuth()
@Controller('person-details')
export class PersonDetailsController {
  constructor(private readonly details: PersonDetailsService) {}

  @Get(':userId')
  @ApiOperation({ summary: 'A person\'s CV and emergency contact, as far as you may see them, and what you may change' })
  read(@CurrentUser() user: CurrentUserData, @Param('userId') userId: string) {
    return this.details.forReader(user.organizationId, user.id, userId);
  }

  @Get(':userId/cv')
  @ApiOperation({ summary: 'Download a person\'s CV, for the person, an admin, or the person they report to' })
  async download(@CurrentUser() user: CurrentUserData, @Param('userId') userId: string, @Res() res: Response) {
    const file = await this.details.theCv(user.organizationId, user.id, userId);
    res.status(HttpStatus.OK)
      .setHeader('Content-Type', file.contentType)
      .setHeader('Content-Disposition', `attachment; filename="${file.fileName.replace(/["\r\n]/g, '')}"`)
      .send(file.body);
  }

  @Post(':userId/cv')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MOST_A_CV_MAY_WEIGH } }))
  @ApiOperation({ summary: 'Add or replace a person\'s CV, a PDF or a Word file, as the person or an admin' })
  upload(@CurrentUser() user: CurrentUserData, @Param('userId') userId: string, @UploadedFile() file: Express.Multer.File) {
    return this.details.setTheCv(user.organizationId, user.id, userId, file);
  }

  @Put(':userId/emergency-contact')
  @ApiOperation({ summary: 'Write a person\'s emergency contact, as the person or an admin' })
  setContact(@CurrentUser() user: CurrentUserData, @Param('userId') userId: string, @Body() body: EmergencyContactIn) {
    return this.details.setTheEmergencyContact(user.organizationId, user.id, userId, body);
  }
}
