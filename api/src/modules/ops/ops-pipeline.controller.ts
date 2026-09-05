import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OpsCapabilityGuard, NeedsOps } from './ops-capability.guard';
import { OpsPipelineService } from './ops-pipeline.service';
import { OpsMetricsService } from './ops-metrics.service';
import { OpsIdentity } from './ops-people.service';
import { OpsDeploymentStage } from '@prisma/client';

interface OpsRequest {
  opsIdentity: OpsIdentity;
}

@ApiTags('Operating system')
@ApiBearerAuth()
@Controller('ops')
@UseGuards(JwtAuthGuard, OpsCapabilityGuard)
export class OpsPipelineController {
  constructor(
    private readonly pipeline: OpsPipelineService,
    private readonly metrics: OpsMetricsService,
  ) {}

  /*
   * The sales routes are gone with the pipeline they served. `/ops/commercial`
   * is the one pipeline now, and it is the one that records who created each
   * opportunity.
   */

  // --- Deployment ---------------------------------------------------------

  @Get('deployments')
  @NeedsOps('deployment:read')
  @ApiOperation({ summary: 'Deployments, optionally only the blocked ones' })
  deployments(@Query('blocked') blocked?: string) {
    return this.pipeline.deployments({ blockedOnly: blocked === 'true' });
  }

  @Post('deployments')
  @NeedsOps('deployment:write')
  @ApiOperation({ summary: 'Start deploying a company' })
  startDeployment(
    @Req() req: OpsRequest,
    @Body() body: { companyKey: string; productOwnerId?: string; technicalOwnerId?: string; targetLiveDate?: string },
  ) {
    return this.pipeline.startDeployment({
      companyKey: body.companyKey,
      deploymentOwnerId: req.opsIdentity.personId,
      productOwnerId: body.productOwnerId,
      technicalOwnerId: body.technicalOwnerId,
      targetLiveDate: body.targetLiveDate ? new Date(body.targetLiveDate) : undefined,
    });
  }

  @Patch('deployments/:id/stage')
  @NeedsOps('deployment:write')
  @ApiOperation({ summary: 'Move a deployment along' })
  advanceDeployment(@Req() req: OpsRequest, @Param('id') id: string, @Body() body: { stage: OpsDeploymentStage }) {
    return this.pipeline.advanceDeployment(id, body.stage, req.opsIdentity.personId);
  }

  @Patch('deployments/:id/blocker')
  @NeedsOps('deployment:write')
  @ApiOperation({ summary: 'Say who a deployment is waiting on, or clear it' })
  deploymentBlocker(
    @Req() req: OpsRequest,
    @Param('id') id: string,
    @Body() body: { type: string | null; summary: string | null },
  ) {
    return this.pipeline.setDeploymentBlocker(id, body, req.opsIdentity.personId);
  }

  // --- Marketing ----------------------------------------------------------

  @Get('campaigns')
  @NeedsOps('marketing:read')
  @ApiOperation({ summary: 'Campaigns and the opportunities that name them' })
  campaigns() {
    return this.pipeline.campaigns();
  }

  @Post('campaigns')
  @NeedsOps('marketing:write')
  @ApiOperation({ summary: 'Plan a campaign against the objective it is run for' })
  createCampaign(
    @Req() req: OpsRequest,
    @Body()
    body: {
      title: string;
      activityType: string;
      channel?: string;
      objectiveId?: string;
      objective?: string;
      startDate: string;
      endDate?: string;
      campaignSource?: string;
    },
  ) {
    return this.pipeline.createCampaign({
      ...body,
      ownerId: req.opsIdentity.personId,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });
  }

  // --- Metrics ------------------------------------------------------------

  @Get('boards')
  @ApiOperation({ summary: 'Which boards you may open, and which you land on' })
  boards(@Req() req: OpsRequest) {
    return this.metrics.boardsFor(req.opsIdentity);
  }

  /** Every number on one board, each with its rows. Nothing here is stored. */
  @Get('boards/:key')
  @ApiOperation({ summary: 'A whole board, computed' })
  async board(@Req() req: OpsRequest, @Param('key') key: string, @Query('period') period = 'sept-2026-target-list') {
    const window = await this.metrics.windowForPeriod(period);
    return this.metrics.board(req.opsIdentity, key, window);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'The metrics this caller may open' })
  catalogue(@Req() req: OpsRequest) {
    return this.metrics.catalogue(req.opsIdentity);
  }

  /**
   * One metric and the rows behind it. There is no version of this that returns
   * the number alone.
   */
  @Get('metrics/:key')
  @ApiOperation({ summary: 'A number, and what made it' })
  async metric(@Req() req: OpsRequest, @Param('key') key: string, @Query('period') period = 'sept-2026-target-list') {
    const window = await this.metrics.windowForPeriod(period);
    return this.metrics.read(req.opsIdentity, key, window);
  }
}
