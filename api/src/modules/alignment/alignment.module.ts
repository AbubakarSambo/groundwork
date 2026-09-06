import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AlignmentService } from './alignment.service';
import { AgreementsService } from './agreements.service';
import { AlignmentController } from './alignment.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AlignmentController],
  providers: [AlignmentService, AgreementsService],
  exports: [AlignmentService, AgreementsService],
})
export class AlignmentModule {}
