import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OpsCapabilityGuard, NeedsOps } from './ops-capability.guard';
import { OpsBuildService } from './ops-build.service';
import { OpsIdentity } from './ops-people.service';
import {
  OpsRoadmapStatus,
  OpsWorkItemStatus,
  OpsUseCaseReadiness,
  OpsApprovalType,
  OpsApprovalStatus,
} from '@prisma/client';

interface OpsRequest {
  opsIdentity: OpsIdentity;
}

@ApiTags('Operating system')
@ApiBearerAuth()
@Controller('ops')
@UseGuards(JwtAuthGuard, OpsCapabilityGuard)
export class OpsBuildController {
  constructor(private readonly build: OpsBuildService) {}

  // --- Roadmap ------------------------------------------------------------

  @Get('roadmap')
  @NeedsOps('product:read')
  @ApiOperation({ summary: 'What we intend to build' })
  roadmap(@Query('status') status?: OpsRoadmapStatus) {
    return this.build.roadmap({ status });
  }

  @Post('roadmap')
  @NeedsOps('roadmap:propose')
  @ApiOperation({ summary: 'Propose something' })
  propose(
    @Req() req: OpsRequest,
    @Body() body: { title: string; description?: string; itemType: string; productArea?: string; priority?: number; approvalRequired?: boolean; rationale?: string; expectedValue?: string; targetDate?: string },
  ) {
    return this.build.propose({
      ...body,
      proposedById: req.opsIdentity.personId,
      targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
    });
  }

  /** Refused, with the reason, while a decision is outstanding. */
  @Patch('roadmap/:id/status')
  @NeedsOps('product:write')
  @ApiOperation({ summary: 'Start, block or finish a roadmap item' })
  setRoadmapStatus(@Req() req: OpsRequest, @Param('id') id: string, @Body() body: { status: OpsRoadmapStatus }) {
    return this.build.setRoadmapStatus(id, body.status, req.opsIdentity.personId);
  }

  // --- Use cases ----------------------------------------------------------

  @Get('use-cases')
  @NeedsOps('product:read')
  @ApiOperation({ summary: 'What each company wants to do, and whether we support it' })
  useCases(@Query('company') company?: string) {
    return this.build.useCases(company);
  }

  @Post('use-cases')
  @NeedsOps('product:write')
  @ApiOperation({ summary: 'Record what a company wants to do' })
  recordUseCase(
    @Body() body: { companyKey: string; title: string; description?: string; expectedWorkflow?: string; category?: string; priority?: number },
  ) {
    return this.build.recordUseCase(body);
  }

  @Patch('use-cases/:id/readiness')
  @NeedsOps('product:write')
  @ApiOperation({ summary: 'Say whether we support it, and what is missing' })
  setReadiness(
    @Req() req: OpsRequest,
    @Param('id') id: string,
    @Body() body: { readiness: OpsUseCaseReadiness; productGap?: string | null; uxGap?: string | null; technicalGap?: string | null },
  ) {
    return this.build.setReadiness(id, body.readiness, body, req.opsIdentity.personId);
  }

  @Post('use-cases/:id/links')
  @NeedsOps('product:write')
  @ApiOperation({ summary: 'Point a use case at the item holding it up' })
  link(@Param('id') id: string, @Body() body: { targetType: string; targetId: string }) {
    return this.build.linkToUseCase(id, body.targetType, body.targetId);
  }

  // --- Tech ---------------------------------------------------------------

  @Get('tech')
  @NeedsOps('tech:read')
  @ApiOperation({ summary: 'Technical work' })
  techItems(@Query('status') status?: OpsWorkItemStatus, @Query('owner') owner?: string) {
    return this.build.techItems({ status, ownerId: owner });
  }

  @Post('tech')
  @NeedsOps('tech:write')
  @ApiOperation({ summary: 'Raise a bug or a piece of infrastructure work' })
  createTech(
    @Body() body: { title: string; description?: string; itemType: string; severity: string; relatedCompanyId?: string; targetDate?: string },
  ) {
    return this.build.createTechItem({
      ...body,
      targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
    });
  }

  @Patch('tech/:id/status')
  @NeedsOps('tech:write')
  @ApiOperation({ summary: 'Move or resolve a technical item' })
  setTechStatus(
    @Req() req: OpsRequest,
    @Param('id') id: string,
    @Body() body: { status: OpsWorkItemStatus; blockerReason?: string },
  ) {
    return this.build.setTechStatus(id, body.status, body.blockerReason, req.opsIdentity.personId);
  }

  // --- UX -----------------------------------------------------------------

  @Get('ux')
  @NeedsOps('ux:read')
  @ApiOperation({ summary: 'Interface problems' })
  uxItems(@Query('status') status?: OpsWorkItemStatus) {
    return this.build.uxItems({ status });
  }

  @Post('ux')
  @NeedsOps('ux:write')
  @ApiOperation({ summary: 'Record an interface problem and where it came from' })
  createUX(
    @Body() body: { title: string; affectedFlow?: string; description?: string; sourceNote?: string; severity: string; relatedCompanyId?: string; relatedUseCaseId?: string },
  ) {
    return this.build.createUXItem(body);
  }

  @Patch('ux/:id/status')
  @NeedsOps('ux:write')
  @ApiOperation({ summary: 'Move or resolve a UX item' })
  setUXStatus(@Req() req: OpsRequest, @Param('id') id: string, @Body() body: { status: OpsWorkItemStatus }) {
    return this.build.setUXStatus(id, body.status, req.opsIdentity.personId);
  }

  // --- Approvals ----------------------------------------------------------

  /** Anybody may ask for a decision. Only the person asked may give one. */
  @Post('approvals')
  @ApiOperation({ summary: 'Ask somebody to decide' })
  request(
    @Req() req: OpsRequest,
    @Body() body: { approvalType: OpsApprovalType; approverId: string; relatedRecordType: string; relatedRecordId: string; requestSummary: string },
  ) {
    return this.build.requestApproval({ ...body, requesterId: req.opsIdentity.personId });
  }

  @Get('approvals')
  @ApiOperation({ summary: 'What is waiting on you' })
  queue(@Req() req: OpsRequest, @Query('status') status?: OpsApprovalStatus) {
    return this.build.queueFor(req.opsIdentity, status ?? 'PENDING');
  }

  @Get('approvals/:recordType/:recordId')
  @ApiOperation({ summary: 'Every decision made about one record' })
  history(@Param('recordType') recordType: string, @Param('recordId') recordId: string) {
    return this.build.approvalsFor(recordType, recordId);
  }

  @Patch('approvals/:id')
  @ApiOperation({ summary: 'Approve, ask for changes, or refuse' })
  decide(
    @Req() req: OpsRequest,
    @Param('id') id: string,
    @Body() body: { status: OpsApprovalStatus; decisionNote?: string },
  ) {
    return this.build.decide(id, body.status, body.decisionNote, req.opsIdentity);
  }
}
