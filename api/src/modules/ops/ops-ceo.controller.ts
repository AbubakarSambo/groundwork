import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OpsCapabilityGuard, NeedsOps } from './ops-capability.guard';
import { OpsCeoService } from './ops-ceo.service';
import { OpsIdentity } from './ops-people.service';
import { OpsFundingStage, OpsStrategicStatus, OpsExpenseStatus } from '@prisma/client';

interface OpsRequest {
  opsIdentity: OpsIdentity;
}

@ApiTags('Operating system')
@ApiBearerAuth()
@Controller('ops')
@UseGuards(JwtAuthGuard, OpsCapabilityGuard)
export class OpsCeoController {
  constructor(private readonly ceo: OpsCeoService) {}

  // --- Fundraise ----------------------------------------------------------

  @Get('fundraise')
  @NeedsOps('fundraise:read')
  @ApiOperation({ summary: 'The funding pipeline, with committed and closed kept apart' })
  fundraise() {
    return this.ceo.fundraise();
  }

  @Post('fundraise')
  @NeedsOps('fundraise:write')
  @ApiOperation({ summary: 'Add a funder' })
  createFunding(
    @Req() req: OpsRequest,
    @Body() body: { funderName: string; fundingType: string; primaryContact?: string; source?: string; askAmount?: number; instrument?: string; applicationDeadline?: string },
  ) {
    return this.ceo.createFunding({
      ...body,
      ownerId: req.opsIdentity.personId,
      applicationDeadline: body.applicationDeadline ? new Date(body.applicationDeadline) : undefined,
    });
  }

  @Patch('fundraise/:id/stage')
  @NeedsOps('fundraise:write')
  @ApiOperation({ summary: 'Move it along, or record what was committed and what closed' })
  advanceFunding(
    @Req() req: OpsRequest,
    @Param('id') id: string,
    @Body() body: { stage: OpsFundingStage; committedAmount?: number; closedAmount?: number },
  ) {
    return this.ceo.advanceFunding(id, body.stage, body, req.opsIdentity.personId);
  }

  @Patch('fundraise/:id/follow-up')
  @NeedsOps('fundraise:write')
  @ApiOperation({ summary: 'Set the next action' })
  fundingFollowUp(@Param('id') id: string, @Body() body: { nextAction: string; dueAt?: string }) {
    return this.ceo.setFundingFollowUp(id, body.nextAction, body.dueAt ? new Date(body.dueAt) : null);
  }

  // --- Strategy -----------------------------------------------------------

  @Get('strategy')
  @NeedsOps('strategy:read')
  @ApiOperation({ summary: 'Relationships that could become something' })
  strategy() {
    return this.ceo.strategy();
  }

  @Post('strategy')
  @NeedsOps('strategy:write')
  @ApiOperation({ summary: 'Record a relationship worth working' })
  createStrategic(
    @Req() req: OpsRequest,
    @Body() body: { personOrNetwork: string; opportunityType: string; organization?: string; objective?: string; source?: string },
  ) {
    return this.ceo.createStrategic({ ...body, ownerId: req.opsIdentity.personId });
  }

  @Patch('strategy/:id/status')
  @NeedsOps('strategy:write')
  @ApiOperation({ summary: 'Move it along' })
  setStrategicStatus(
    @Param('id') id: string,
    @Body() body: { status: OpsStrategicStatus; nextStep?: string; nextStepDueAt?: string },
  ) {
    return this.ceo.setStrategicStatus(
      id,
      body.status,
      body.nextStep,
      body.nextStepDueAt ? new Date(body.nextStepDueAt) : undefined,
    );
  }

  /** Points at what it became, rather than asserting that it became something. */
  @Patch('strategy/:id/converted')
  @NeedsOps('strategy:write')
  @ApiOperation({ summary: 'Say what this turned into' })
  convert(@Param('id') id: string, @Body() body: { convertedToType: string; convertedToId: string }) {
    return this.ceo.recordConversion(id, body.convertedToType, body.convertedToId);
  }

  // --- Resourcing ---------------------------------------------------------

  /** Anybody may ask for help. Only the CEO decides. */
  @Post('resourcing')
  @ApiOperation({ summary: 'Say what you cannot deliver without' })
  requestResource(
    @Req() req: OpsRequest,
    @Body() body: { supportNeeded: string; reason: string; urgency: string; affectedWorkType?: string; affectedRecordId?: string; requestedByDate?: string },
  ) {
    return this.ceo.createResourceRequest({
      ...body,
      requesterId: req.opsIdentity.personId,
      requestedByDate: body.requestedByDate ? new Date(body.requestedByDate) : undefined,
    });
  }

  @Get('resourcing')
  @NeedsOps('resourcing:approve')
  @ApiOperation({ summary: 'What people say they cannot deliver without' })
  resourceRequests() {
    return this.ceo.resourceRequests();
  }

  @Patch('resourcing/:id/closed')
  @NeedsOps('resourcing:approve')
  @ApiOperation({ summary: 'Mark it decided, once the approval carries the answer' })
  closeResource(@Param('id') id: string) {
    return this.ceo.closeResourceRequest(id);
  }

  // --- Spend --------------------------------------------------------------

  @Get('spend')
  @ApiOperation({ summary: 'Your spend, or everybody’s if you approve it' })
  expenses(@Req() req: OpsRequest, @Query('person') person?: string) {
    return this.ceo.expensesFor(req.opsIdentity, person);
  }

  @Post('spend')
  @NeedsOps('spend:submit')
  @ApiOperation({ summary: 'Claim something back' })
  submitExpense(
    @Req() req: OpsRequest,
    @Body() body: { date: string; description: string; category: string; amount: number; receiptUrl?: string; notes?: string },
  ) {
    return this.ceo.submitExpense({
      ...body,
      requesterId: req.opsIdentity.personId,
      date: new Date(body.date),
    });
  }

  @Patch('spend/:id')
  @NeedsOps('spend:approve')
  @ApiOperation({ summary: 'Approve, pay or refuse — never your own' })
  decideExpense(
    @Req() req: OpsRequest,
    @Param('id') id: string,
    @Body() body: { status: OpsExpenseStatus; rejectedReason?: string },
  ) {
    return this.ceo.decideExpense(id, body.status, req.opsIdentity, body.rejectedReason);
  }

  @Post('earnings')
  @NeedsOps('ceo:board')
  @ApiOperation({ summary: 'Record money in' })
  recordEarnings(
    @Req() req: OpsRequest,
    @Body() body: { date: string; amount: number; source: string; note?: string },
  ) {
    return this.ceo.recordEarnings({
      ...body,
      date: new Date(body.date),
      recordedById: req.opsIdentity.personId,
    });
  }

  @Get('balance')
  @NeedsOps('spend:approve')
  @ApiOperation({ summary: 'What is left, and what it is made of' })
  balance() {
    return this.ceo.balance();
  }
}
