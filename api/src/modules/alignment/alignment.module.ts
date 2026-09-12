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
  /*
   * GroundsModule BEHIND A forwardRef, WHICH IS WHY THE API COULD NOT START.
   *
   * The load order is AppModule -> UsersModule -> GroundsModule -> PatternsModule ->
   * ConversationModule -> DocumentsModule -> AlignmentModule, so by the time this module is read
   * GroundsModule is still part-way through its own initialisation and the binding is undefined.
   * Nest says exactly that - "the module at index [1] of the AlignmentModule imports array is
   * undefined" - and refuses to boot. ConversationModule was already wrapped for the same reason;
   * this one was one cycle further round and had not been hit yet.
   */
  imports: [PrismaModule, forwardRef(() => GroundsModule), forwardRef(() => ConversationModule)],
  controllers: [AlignmentController],
  providers: [AlignmentService, AgreementsService, AssertionsService, PartiesService, ObligationsService, WhatEachSideUnderstands],
  exports: [AlignmentService, AgreementsService, AssertionsService, PartiesService, ObligationsService],
})
export class AlignmentModule {}
