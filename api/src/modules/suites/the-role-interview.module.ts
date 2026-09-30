import { Module } from '@nestjs/common';
import { RoleInterviewController } from './the-role-interview.controller';
import { RoleInterviewService } from './the-role-interview.service';
import { RoleGapNotesService } from './the-role-gap-notes.service';

/** The role interview's door and the writer of why a job nobody owns matters (request 25). */
@Module({
  controllers: [RoleInterviewController],
  providers: [RoleInterviewService, RoleGapNotesService],
})
export class RoleInterviewModule {}
