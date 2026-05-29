import { Module } from '@nestjs/common';
import { ResolutionService } from './resolution.service';
import { ResolutionController } from './resolution.controller';
import { IntelligenceModule } from '../intelligence';

@Module({
  imports: [IntelligenceModule], // for recordOutcome (learning loop)
  controllers: [ResolutionController],
  providers: [ResolutionService],
  exports: [ResolutionService],
})
export class ResolutionModule {}
