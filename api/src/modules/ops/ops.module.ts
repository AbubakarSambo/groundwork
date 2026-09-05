import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OpsController } from './ops.controller';
import { OpsPeopleService } from './ops-people.service';
import { OpsFoundationService } from './ops-foundation.service';
import { OpsCapabilityGuard } from './ops-capability.guard';
import { OpsTargetCompaniesController } from './ops-target-companies.controller';
import { OpsTargetCompaniesService } from './ops-target-companies.service';
import { OpsCompaniesService } from './ops-companies.service';
import { OpsSettingsService } from './ops-settings.service';
import { OpsPipelineController } from './ops-pipeline.controller';
import { OpsPipelineService } from './ops-pipeline.service';
import { OpsMetricsService } from './ops-metrics.service';
import { OpsBuildController } from './ops-build.controller';
import { OpsBuildService } from './ops-build.service';
import { OpsMoatService } from './ops-moat.service';
import { OpsCommercialController } from './ops-commercial.controller';
import { OpsCommercialService } from './ops-commercial.service';
import { OpsContributionService } from './ops-contribution.service';
import { OpsIntentController } from './ops-intent.controller';
import { OpsIntentService } from './ops-intent.service';
import { OpsCeoController } from './ops-ceo.controller';
import { OpsCeoService } from './ops-ceo.service';
import { OpsIntegrationService } from './ops-integration.service';
import { OpsDoorService } from './the-door-into-the-ops-system';
import { OpsDoorController } from './ops-door.controller';

/**
 * The back office the Groundwork team runs on.
 *
 * It shares a database and a Nest application with the product, and nothing
 * else. See `the-boundary-that-must-not-move.spec.ts` for what that costs.
 */
@Module({
  imports: [PrismaModule],
  controllers: [OpsController, OpsTargetCompaniesController, OpsPipelineController, OpsBuildController, OpsIntentController, OpsCeoController, OpsCommercialController, OpsDoorController],
  providers: [
    OpsPeopleService,
    OpsFoundationService,
    OpsDoorService,
    OpsCapabilityGuard,
    OpsTargetCompaniesService,
    OpsCompaniesService,
    OpsSettingsService,
    OpsPipelineService,
    OpsMetricsService,
    OpsBuildService,
    OpsMoatService,
    OpsCommercialService,
    OpsContributionService,
    OpsIntentService,
    OpsCeoService,
    OpsIntegrationService,
  ],
  exports: [OpsPeopleService, OpsDoorService],
})
export class OpsModule {}
