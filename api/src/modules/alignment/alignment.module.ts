import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AlignmentService } from './alignment.service';
import { AgreementsService } from './agreements.service';
import { AssertionsService } from './assertions.service';
import { PartiesService } from './parties.service';
import { ObligationsService } from './obligations.service';
import { GroundsModule } from '../grounds';
import { AlignmentController } from './alignment.controller';
import { WhatEachSideUnderstands } from './it-listens-for-a-check-in-and-writes-nothing-else';
import { ConversationModule } from '../conversation';

@Module({
  imports: [PrismaModule, forwardRef(() => GroundsModule), forwardRef(() => ConversationModule)],
  controllers: [AlignmentController],
  providers: [AlignmentService, AgreementsService, AssertionsService, PartiesService, ObligationsService, WhatEachSideUnderstands],
  exports: [AlignmentService, AgreementsService, AssertionsService, PartiesService, ObligationsService],
})
export class AlignmentModule {}
