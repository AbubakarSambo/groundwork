import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BulkImportService } from '../subjects/bulk-import.service';

/**
 * WHAT AN IMPORT COULD NOT TAKE, FOR THE PERSON WHO HAS TO FIX IT.
 *
 * The failure list already existed and was reachable only with a machine token - so the one thing
 * the console is for, finding the rows that did not land, needed somebody who already knew the
 * endpoint. That is the same failure as "3,999 succeeded" with no way to find the other one, moved
 * one layer out: the information existed and the person who needed it could not get at it.
 *
 * Session-authenticated and admin-only, because this is a human in the console. The machine-facing
 * `GET /jobs/{id}` is unchanged and still exists for the integration itself.
 */
@ApiTags('Integration imports')
@Controller('integrations/imports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ImportsController {
  constructor(private readonly bulk: BulkImportService) {}

  @Get()
  @ApiOperation({ summary: 'Recent imports with their counts, and whether detection is still quiet' })
  list(@CurrentUser('organizationId') organizationId: string) {
    return this.bulk.recentJobs(organizationId);
  }

  @Get(':jobId')
  @ApiOperation({ summary: 'One import, with every row it could not take' })
  one(@CurrentUser('organizationId') organizationId: string, @Param('jobId') jobId: string) {
    return this.bulk.status(organizationId, jobId);
  }
}
