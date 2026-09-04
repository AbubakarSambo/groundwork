import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OpsCapabilityGuard, NeedsOps } from './ops-capability.guard';
import { OpsPipelineService } from './ops-pipeline.service';
import { OpsMetricsService } from './ops-metrics.service';
import { OpsIdentity } from './ops-people.service';
import { OpsSalesStage, OpsDeploymentStage } from '@prisma/client';

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

  // --- Sales --------------------------------------------------------------

  @Get('pipeline')
  @NeedsOps('sales:read')
  @ApiOperation({ summary: 'The pipeline, optionally by stage or owner' })
  list(@Query('stage') stage?: OpsSalesStage, @Query('owner') owner?: string) {
    return this.pipeline.pipeline({ stage, ownerId: owner });
  }

  @Post('pipeline')
  @NeedsOps('sales:write')
  @ApiOperation({ summary: 'Open an opportunity against a company' })
  open(
    @Req() req: OpsRequest,
    @Body() body: { companyKey: string; source?: string; campaignId?: string; estimatedValue?: number; useCaseSummary?: string },
  ) {
    return this.pipeline.openOpportunity({ ...body, salesOwnerId: req.opsIdentity.personId });
  }

  @Patch('pipeline/:id/stage')
  @NeedsOps('sales:write')
  @ApiOperation({ summary: 'Move an opportunity along, or lose it' })
  advance(
    @Req() req: OpsRequest,
    @Param('id') id: string,
    @Body() body: { stage: OpsSalesStage; lostReason?: string },
  ) {
    return this.pipeline.advance(id, body.stage, req.opsIdentity.personId, body.lostReason);
  }

  @Patch('pipeline/:id/follow-up')
  @NeedsOps('sales:write')
  @ApiOperation({ summary: 'Set the next action and when it is due' })
  followUp(@Req() req: OpsRequest, @Param('id') id: string, @Body() body: { nextAction: string; dueAt?: string }) {
    return this.pipeline.setFollowUp(
      id,
      body.nextAction,
      body.dueAt ? new Date(body.dueAt) : null,
      req.opsIdentity.personId,
    );
  }

  @Post('pipeline/:id/activity')
  @NeedsOps('sales:write')
  @ApiOperation({ summary: 'Log a call, a demo, a proposal' })
  activity(
    @Req() req: OpsRequest,
    @Param('id') id: string,
    @Body() body: { kind: string; note?: string; evidenceUrl?: string; happenedAt?: string },
  ) {
    return this.pipeline.logActivity({
      opportunityId: id,
      kind: body.kind,
      note: body.note,
      evidenceUrl: body.evidenceUrl,
      happenedAt: body.happenedAt ? new Date(body.happenedAt) : undefined,
      actorPersonId: req.opsIdentity.personId,
    });
  }

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
  @ApiOperation({ summary: 'Plan a campaign' })
  createCampaign(
    @Req() req: OpsRequest,
    @Body() body: { title: string; activityType: string; channel?: string; objective?: string; startDate: string; endDate?: string; campaignSource?: string },
  ) {
    return this.pipeline.createCampaign({
      ...body,
      ownerId: req.opsIdentity.personId,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });
  }

  // --- Metrics ------------------------------------------------------------

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
  async metric(@Req() req: OpsRequest, @Param('key') key: string, @Query('period') period = 'sept-2026-sprint') {
    const window = await this.metrics.windowForPeriod(period);
    return this.metrics.read(req.opsIdentity, key, window);
  }
}
