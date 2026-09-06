import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AlignmentService } from './alignment.service';
import { AgreementsService } from './agreements.service';
import { AssertionsService } from './assertions.service';
import { PartiesService } from './parties.service';
import { ObligationsService } from './obligations.service';
import { GroundsModule } from '../grounds';
import { AlignmentController } from './alignment.controller';

@Module({
  imports: [PrismaModule, GroundsModule],
  controllers: [AlignmentController],
  providers: [AlignmentService, AgreementsService, AssertionsService, PartiesService, ObligationsService],
  exports: [AlignmentService, AgreementsService, AssertionsService, PartiesService, ObligationsService],
})
export class AlignmentModule {}
