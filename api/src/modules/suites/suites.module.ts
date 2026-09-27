import { Module } from '@nestjs/common';
import { SuitesService } from './suites.service';
import { SuitesController } from './suites.controller';
import { OnboardingBoardService } from './the-onboarding-board.service';
import { LeaveBoardService } from './the-leave-board.service';

@Module({
  controllers: [SuitesController],
  providers: [SuitesService, OnboardingBoardService, LeaveBoardService],
  exports: [SuitesService, LeaveBoardService],
})
export class SuitesModule {}
