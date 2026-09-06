import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AlignmentService } from './alignment.service';
import { AgreementsService } from './agreements.service';
import { AssertionsService } from './assertions.service';
import { AlignmentController } from './alignment.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AlignmentController],
  providers: [AlignmentService, AgreementsService, AssertionsService],
  exports: [AlignmentService, AgreementsService, AssertionsService],
})
export class AlignmentModule {}
