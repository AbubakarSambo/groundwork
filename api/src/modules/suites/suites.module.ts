import { Module } from '@nestjs/common';
import { SuitesService } from './suites.service';
import { SuitesController } from './suites.controller';
import { OnboardingBoardService } from './the-onboarding-board.service';

@Module({
  controllers: [SuitesController],
  providers: [SuitesService, OnboardingBoardService],
  exports: [SuitesService],
})
export class SuitesModule {}
