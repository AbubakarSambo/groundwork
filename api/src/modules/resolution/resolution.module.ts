import { Module } from '@nestjs/common';
import { ResolutionService } from './resolution.service';
import { ResolutionController } from './resolution.controller';
import { IntelligenceModule } from '../intelligence';
import { ReportsModule } from '../reports';

@Module({
  imports: [
    IntelligenceModule, // for recordOutcome (learning loop)
    /**
     * And for the OTHER half of that loop. recordOutcome writes the Outcome row;
     * recordOutcomeLearning enriches it with sessionCount and the fairness rate,
     * which are exactly the fields the weekly learning cron selects - and nothing
     * called it, so that report has been reading columns nobody filled.
     */
    ReportsModule,
  ],
  controllers: [ResolutionController],
  providers: [ResolutionService],
  exports: [ResolutionService],
})
export class ResolutionModule {}
