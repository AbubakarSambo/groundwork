import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OpsCapabilityGuard, NeedsOps } from './ops-capability.guard';
import { OpsSprintService } from './ops-sprint.service';
import { OpsCompaniesService } from './ops-companies.service';
import { OpsSettingsService } from './ops-settings.service';
import { OpsIdentity } from './ops-people.service';
import { OpsCompanyStage, OpsQualifyingStatus } from '@prisma/client';

interface OpsRequest {
  opsIdentity: OpsIdentity;
}

@ApiTags('Operating system')
@ApiBearerAuth()
@Controller('ops')
@UseGuards(JwtAuthGuard, OpsCapabilityGuard)
export class OpsSprintController {
  constructor(
    private readonly sprint: OpsSprintService,
    private readonly companies: OpsCompaniesService,
    private readonly settings: OpsSettingsService,
  ) {}

  /**
   * The whole sprint on one page. Readable by anybody on the team: the point of
   * a sprint is that the six of us are looking at the same ten companies.
   */
  @Get('sprint/:periodKey')
  @NeedsOps('sprint:read')
  @ApiOperation({ summary: 'Every company in a sprint, how far it has got, and what is next' })
  board(@Param('periodKey') periodKey: string) {
    return this.sprint.board(periodKey);
  }

  @Get('companies')
  @NeedsOps('sales:read')
  @ApiOperation({ summary: 'Companies, optionally narrowed to one sprint' })
  list(@Query('sprint') sprint?: string) {
    return this.companies.list(sprint);
  }

  /** Everything about one company, in the order somebody asks. */
  @Get('companies/:key')
  @NeedsOps('sprint:read')
  @ApiOperation({ summary: 'One company, every angle, and what has happened' })
  detail(@Param('key') key: string) {
    return this.companies.detail(key);
  }

  @Post('companies')
  @NeedsOps('sales:write')
  @ApiOperation({ summary: 'Add a company' })
  add(@Req() req: OpsRequest, @Body() body: { name: string; sprintPeriodKey?: string; source?: string; primaryContactName?: string; primaryContactEmail?: string; notes?: string }) {
    return this.companies.add(body, req.opsIdentity.personId);
  }

  @Patch('companies/:key/stage')
  @NeedsOps('sales:write')
  @ApiOperation({ summary: 'Move a company to a stage' })
  setStage(@Req() req: OpsRequest, @Param('key') key: string, @Body() body: { stage: OpsCompanyStage }) {
    return this.companies.setStage(key, body.stage, req.opsIdentity.personId);
  }

  @Patch('companies/:key/next-action')
  @NeedsOps('sales:write')
  @ApiOperation({ summary: 'Say what happens next and when' })
  setNextAction(@Req() req: OpsRequest, @Param('key') key: string, @Body() body: { nextAction: string; dueAt?: string }) {
    return this.companies.setNextAction(
      key,
      body.nextAction,
      body.dueAt ? new Date(body.dueAt) : null,
      req.opsIdentity.personId,
    );
  }

  @Patch('companies/:key/blocker')
  @NeedsOps('sales:write')
  @ApiOperation({ summary: 'Record or clear what is holding a company up' })
  blocker(@Req() req: OpsRequest, @Param('key') key: string, @Body() body: { summary: string | null }) {
    return this.companies.recordBlocker(key, body.summary, req.opsIdentity.personId);
  }

  /**
   * A contributor records the company they brought. They hold
   * `contributor:self` and nothing else, and this is the one write they have.
   */
  @Post('attributions')
  @NeedsOps('contributor:self')
  @ApiOperation({ summary: 'Record that somebody brought a company' })
  attribute(
    @Req() req: OpsRequest,
    @Body() body: { companyKey: string; contributorKey?: string; sourceType: string; sourceDetail?: string },
  ) {
    return this.companies.attribute({
      ...body,
      // Their own by default. Naming somebody else needs the capability to see
      // everybody's, which is the same permission as counting for them.
      contributorKey:
        body.contributorKey && req.opsIdentity.capabilities.includes('contributor:read-all')
          ? body.contributorKey
          : req.opsIdentity.key,
    });
  }

  @Patch('attributions/:companyKey/:contributorKey')
  @NeedsOps('sales:write')
  @ApiOperation({ summary: 'Move an introduction along' })
  qualify(
    @Req() req: OpsRequest,
    @Param('companyKey') companyKey: string,
    @Param('contributorKey') contributorKey: string,
    @Body() body: { status: OpsQualifyingStatus },
  ) {
    return this.companies.setQualifyingStatus(companyKey, contributorKey, body.status, req.opsIdentity.personId);
  }

  /** Their own standing, or anybody's with `contributor:read-all`. */
  @Get('standing/:personKey')
  @ApiOperation({ summary: 'Where somebody stands against their target' })
  standing(@Req() req: OpsRequest, @Param('personKey') personKey: string) {
    return this.sprint.standingFor(req.opsIdentity, personKey);
  }

  @Get('settings')
  @ApiOperation({ summary: 'The decisions this system runs on' })
  allSettings() {
    return this.settings.all();
  }

  @Patch('settings/:key')
  @NeedsOps('ceo:board')
  @ApiOperation({ summary: 'Change one of them' })
  setSetting(@Req() req: OpsRequest, @Param('key') key: string, @Body() body: { value: string }) {
    return this.settings.set(key, body.value, req.opsIdentity.key);
  }
}
