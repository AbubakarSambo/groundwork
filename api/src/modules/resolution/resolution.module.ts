import { Module } from '@nestjs/common';
import { ResolutionService } from './resolution.service';
import { ResolutionController } from './resolution.controller';
import { IntelligenceModule } from '../intelligence';
import { ReportsModule } from '../reports';
import { SuggestionsModule } from '../suggestions/suggestions.module';
import { SuitesModule } from '../suites/suites.module';

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
    /** For the ending page's suggestions (week 11). */
    SuggestionsModule,
    /** For proposing a review when a check-in about one person ends (week 11). */
    SuitesModule,
  ],
  controllers: [ResolutionController],
  providers: [ResolutionService],
  exports: [ResolutionService],
})
export class ResolutionModule {}
