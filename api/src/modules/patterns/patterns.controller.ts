import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PatternsService } from './patterns.service';
import { CurrentUser, Roles, Role } from '../../common';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';

@ApiTags('Patterns')
@ApiBearerAuth()
@Controller('patterns')
export class PatternsController {
  constructor(private readonly patterns: PatternsService) {}

  /**
   * PLATFORM ADMIN, not org admin. The guard used to be `@Roles(Role.ADMIN)`
   * while the summary said "platform admin only", and the two disagreed in the
   * direction that matters: `codeAccuracySummary()` takes no organizationId and
   * aggregates detections across EVERY org, so any customer's own admin could
   * read a statistic computed from every other customer's grounds.
   *
   * Nothing called this endpoint, so nobody exercised the gap. It is being wired
   * to the platform dashboard now, which is exactly why the guard has to be
   * right first.
   */
  @Get('accuracy')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: 'Per-code accuracy summary across all orgs (platform admin only)' })
  async accuracySummary() {
    return this.patterns.codeAccuracySummary();
  }

  @Patch(':id/rate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Rate accuracy of a surfaced pattern detection' })
  async rate(
    @Param('id') id: string,
    @Body() body: { accurate: boolean },
    @CurrentUser('id') userId: string,
  ) {
    await this.patterns.rateAccuracy(id, body.accurate, userId);
    return { rated: true };
  }
}
