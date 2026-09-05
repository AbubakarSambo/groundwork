import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OpsCapabilityGuard, NeedsOps } from './ops-capability.guard';
import { OpsIntentService } from './ops-intent.service';
import { OpsIdentity } from './ops-people.service';
import { OpsServes, OpsObjectiveStatus, OpsCommitmentStatus, OpsTodoStatus } from '@prisma/client';

interface OpsRequest {
  opsIdentity: OpsIdentity;
}

@ApiTags('Operating system')
@ApiBearerAuth()
@Controller('ops')
@UseGuards(JwtAuthGuard, OpsCapabilityGuard)
export class OpsIntentController {
  constructor(private readonly intent: OpsIntentService) {}

  // --- Objectives ---------------------------------------------------------

  /** Every key result's number is computed as this is read. None is stored. */
  @Get('objectives/:periodKey')
  @ApiOperation({ summary: "A quarter's objectives, with live numbers" })
  objectives(@Param('periodKey') periodKey: string) {
    return this.intent.objectives(periodKey);
  }

  /** How much of a period is aimed at scale, and where a sales claim outruns the pipeline. */
  @Get('objectives/:periodKey/aim')
  @ApiOperation({ summary: 'How much of a period is aimed at revenue or the moat' })
  howTheQuarterIsAimed(@Param('periodKey') periodKey: string) {
    return this.intent.howTheQuarterIsAimed(periodKey);
  }

  @Post('objectives')
  @NeedsOps('objectives:write')
  @ApiOperation({ summary: 'Set an objective for a workstream' })
  createObjective(
    @Req() req: OpsRequest,
    @Body()
    body: {
      periodKey: string;
      workstreamKey: string;
      title: string;
      description?: string;
      ownerKey: string;
      serves: OpsServes;
      justification: string;
      instead: string;
      companiesExpected?: number;
      valuePerCompanyCents?: number;
      priority?: number;
    },
  ) {
    /* The owner is chosen, not inherited from whoever is signed in. That was
       the defect: an objective owned by the person who opened the form. */
    return this.intent.createObjective(body);
  }

  @Post('objectives/:id/key-results')
  @NeedsOps('objectives:write')
  @ApiOperation({ summary: 'Add the number that says whether it happened' })
  addKeyResult(
    @Req() req: OpsRequest,
    @Param('id') id: string,
    @Body() body: { title: string; metricType: string; targetValue: number; unit: string; startValue?: number; measurementSource: string; ownerKey: string; dueDate: string },
  ) {
    return this.intent.addKeyResult({
      ...body,
      objectiveId: id,
      dueDate: new Date(body.dueDate),
    });
  }

  @Patch('objectives/:id/status')
  @NeedsOps('objectives:write')
  @ApiOperation({ summary: 'Activate, achieve, miss or archive an objective' })
  setObjectiveStatus(@Param('id') id: string, @Body() body: { status: OpsObjectiveStatus }) {
    return this.intent.setObjectiveStatus(id, body.status);
  }

  // --- Commitments --------------------------------------------------------

  @Get('commitments/:personKey/:periodKey')
  @ApiOperation({ summary: "Somebody's commitments for a cycle, with the live number against each" })
  commitments(@Req() req: OpsRequest, @Param('personKey') personKey: string, @Param('periodKey') periodKey: string) {
    return this.intent.commitmentsFor(req.opsIdentity, personKey, periodKey);
  }

  @Post('commitments')
  @ApiOperation({ summary: 'Say what you will do this cycle' })
  makeCommitment(
    @Req() req: OpsRequest,
    @Body() body: { operatingPeriodKey: string; title: string; description?: string; measureType: string; targetValue?: number; unit?: string; measurementSource: string; dueDate: string; linkedKeyResultId?: string; workstreamKey?: string },
  ) {
    return this.intent.makeCommitment({
      ...body,
      ownerId: req.opsIdentity.personId,
      dueDate: new Date(body.dueDate),
    });
  }

  @Patch('commitments/:id/close')
  @ApiOperation({ summary: 'Close it with what actually happened' })
  close(
    @Req() req: OpsRequest,
    @Param('id') id: string,
    @Body() body: { status: OpsCommitmentStatus; actualResult: string; evidenceUrl?: string },
  ) {
    return this.intent.closeCommitment(id, body, req.opsIdentity);
  }

  @Patch('commitments/:id/blocked')
  @ApiOperation({ summary: 'Say it is blocked, and on what' })
  blocked(@Req() req: OpsRequest, @Param('id') id: string, @Body() body: { reason: string | null }) {
    return this.intent.flagBlocked(id, body.reason, req.opsIdentity);
  }

  @Post('commitments/:id/links')
  @ApiOperation({ summary: 'Point a commitment at the records it is about' })
  link(@Param('id') id: string, @Body() body: { targetType: string; targetId: string }) {
    return this.intent.linkCommitment(id, body.targetType, body.targetId);
  }

  // --- To-dos -------------------------------------------------------------

  @Get('todos/:personKey')
  @ApiOperation({ summary: "Somebody's to-dos" })
  todos(@Req() req: OpsRequest, @Param('personKey') personKey: string) {
    return this.intent.todosFor(req.opsIdentity, personKey);
  }

  @Post('todos')
  @ApiOperation({ summary: 'Add one, for yourself or for somebody you may assign to' })
  addTodo(
    @Req() req: OpsRequest,
    @Body() body: { title: string; ownerKey?: string; dueDate?: string; relatedRecordType?: string; relatedRecordId?: string; notes?: string },
  ) {
    return this.intent.addTodo(
      {
        ...body,
        ownerKey: body.ownerKey ?? req.opsIdentity.key,
        assignedById: req.opsIdentity.personId,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      },
      req.opsIdentity,
    );
  }

  @Patch('todos/:id/status')
  @ApiOperation({ summary: 'Done, or cancelled' })
  setTodoStatus(@Req() req: OpsRequest, @Param('id') id: string, @Body() body: { status: OpsTodoStatus }) {
    return this.intent.setTodoStatus(id, body.status, req.opsIdentity);
  }
}
