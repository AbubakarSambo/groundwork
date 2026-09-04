import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OpsController } from './ops.controller';
import { OpsPeopleService } from './ops-people.service';
import { OpsFoundationService } from './ops-foundation.service';
import { OpsCapabilityGuard } from './ops-capability.guard';

/**
 * The back office the Groundwork team runs on.
 *
 * It shares a database and a Nest application with the product, and nothing
 * else. See `the-boundary-that-must-not-move.spec.ts` for what that costs.
 */
@Module({
  imports: [PrismaModule],
  controllers: [OpsController],
  providers: [OpsPeopleService, OpsFoundationService, OpsCapabilityGuard],
  exports: [OpsPeopleService],
})
export class OpsModule {}
