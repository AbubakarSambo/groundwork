import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OpsCapabilityGuard } from './ops-capability.guard';
import { OpsPeopleService } from './ops-people.service';
import { OpsFoundationService } from './ops-foundation.service';
import { OpsIntegrationService } from './ops-integration.service';
import { OpsProductStatementService } from './ops-product-statement.service';
import { NeedsOps } from './ops-capability.guard';
import { Post, Patch, Delete, Body, Query } from '@nestjs/common';
import { OPS_CAPABILITIES } from './what-somebody-may-do';
import { OpsFunctionalRole } from '@prisma/client';

@ApiTags('Operating system')
@ApiBearerAuth()
@Controller('ops')
@UseGuards(JwtAuthGuard, OpsCapabilityGuard)
export class OpsController {
  constructor(
    private readonly people: OpsPeopleService,
    private readonly foundation: OpsFoundationService,
    private readonly integration: OpsIntegrationService,
    private readonly statement: OpsProductStatementService,
  ) {}

  /**
   * WHAT WE SAY THIS PRODUCT IS. The document every deck, campaign and page is
   * measured against, so everybody may read it and only the CEO may change it.
   */
  @Get('what-we-are')
  @ApiOperation({ summary: 'What this product is, and what it is not' })
  whatWeAre() {
    return this.statement.current();
  }

  @Get('what-we-are/history')
  @ApiOperation({ summary: 'Every version there has been, newest first' })
  whatWeUsedToSay() {
    return this.statement.history();
  }

  @Post('what-we-are')
  @NeedsOps('ceo:board')
  @ApiOperation({ summary: 'Say it differently. A new version, never an edit.' })
  sayItDifferently(
    @Req() req: { opsIdentity: { key: string } },
    @Body() body: { headline: string; saidOutLoud: string; isIt: string[]; isNotIt: string[]; because?: string },
  ) {
    return this.statement.say(body, req.opsIdentity.key);
  }

  /**
   * Who the caller is here and what they may do. The front end asks this once
   * and hides what it would only be told 403 about.
   */
  @Get('me')
  @ApiOperation({ summary: 'The caller as this system knows them' })
  async me(@Req() req: { opsIdentity: unknown }) {
    return req.opsIdentity;
  }

  /** The periods we are working in, so every board can date itself. */
  @Get('periods')
  @ApiOperation({ summary: 'TargetLists, quarters and cycles' })
  async periods() {
    return this.foundation.periods();
  }

  /**
   * Start a list, over whatever dates somebody chooses.
   *
   * TargetLists only. A quarter is the calendar and a cycle hangs off one; neither
   * is a decision this form gets to make.
   */
  @Post('periods')
  @NeedsOps('periods:write')
  @ApiOperation({ summary: 'Start a list over any stretch of time' })
  async startATargetList(@Body() body: { name: string; startsOn: string; endsOn: string; goal?: string }) {
    return this.foundation.startATargetList({
      name: body.name,
      startsOn: new Date(body.startsOn),
      endsOn: new Date(body.endsOn),
      goal: body.goal,
    });
  }

  /** Move its dates, rename it, open it, close it. The key never moves. */
  @Patch('periods/:key')
  @NeedsOps('periods:write')
  @ApiOperation({ summary: 'Re-date, rename, open or close a target list' })
  async resetATargetList(
    @Param('key') key: string,
    @Body() body: { name?: string; startsOn?: string; endsOn?: string; goal?: string | null; status?: 'PLANNED' | 'OPEN' | 'CLOSED' },
  ) {
    return this.foundation.resetATargetList(key, {
      name: body.name,
      startsOn: body.startsOn ? new Date(body.startsOn) : undefined,
      endsOn: body.endsOn ? new Date(body.endsOn) : undefined,
      goal: body.goal,
      status: body.status,
    });
  }

  /**
   * A token for the assistant panel, and where to take it.
   *
   * No capability: it is scoped to the caller by construction — the token names
   * them and nobody else, and the person asking is already on this team or the
   * guard would not have let them in.
   */
  @Get('assistant/panel')
  @ApiOperation({ summary: 'A short-lived token for the Groundwork assistant panel. Never the shared key.' })
  assistantPanel(@Req() req: { opsIdentity: { key: string } }) {
    return this.integration.panelFor(req.opsIdentity.key);
  }

  /**
   * Whether Groundwork is connected, and what the last push did. Never the secret.
   */
  @Get('integration')
  @NeedsOps('integration:read')
  @ApiOperation({ summary: 'The connection out to Groundwork' })
  integrationStatus() {
    return this.integration.status();
  }

  @Patch('integration')
  @NeedsOps('integration:manage')
  @ApiOperation({ summary: 'Point it at a Groundwork, or switch it off' })
  configure(
    @Req() req: { opsIdentity: { key: string } },
    @Body() body: { baseUrl?: string; clientId?: string; clientSecret?: string; enabled?: boolean; checkInId?: string; organizationId?: string; embedSecret?: string },
  ) {
    return this.integration.configure(body, req.opsIdentity.key);
  }

  /** Sends our objectives and activity across. Nothing here reads back. */
  @Post('integration/push')
  @NeedsOps('integration:manage')
  @ApiOperation({ summary: 'Send this period across to Groundwork' })
  push(@Query('period') period = 'sept-2026-target-list') {
    return this.integration.push(period);
  }

  // --- The team ------------------------------------------------------------

  @Get('people')
  @NeedsOps('people:admin')
  @ApiOperation({ summary: 'Everybody here and what each of them holds' })
  everybody() {
    return this.people.everybody();
  }

  /** Every capability this system has, so a grant screen cannot invent one. */
  @Get('capabilities')
  @NeedsOps('people:admin')
  @ApiOperation({ summary: 'The capabilities that exist' })
  capabilities() {
    return OPS_CAPABILITIES;
  }

  /** The roles somebody can hold, with what each comes with. One source. */
  @Get('roles')
  @NeedsOps('people:admin')
  @ApiOperation({ summary: 'The roles, and the capabilities each comes with' })
  roles() {
    return this.people.roles();
  }

  @Patch('people/:key/role')
  @NeedsOps('people:admin')
  @ApiOperation({ summary: 'Change what somebody does. Adds that role’s capabilities, removes none.' })
  changeRole(@Param('key') key: string, @Body() body: { functionalRole: OpsFunctionalRole }) {
    return this.people.changeRole(key, body.functionalRole);
  }

  @Post('people')
  @NeedsOps('people:admin')
  @ApiOperation({ summary: 'Add somebody to the team' })
  addPerson(@Body() body: { key: string; displayName: string; email?: string; functionalRole: OpsFunctionalRole }) {
    return this.people.addPerson(body);
  }

  @Post('people/:key/grants')
  @NeedsOps('people:admin')
  @ApiOperation({ summary: 'Give somebody a capability' })
  grant(@Req() req: { opsIdentity: { key: string } }, @Param('key') key: string, @Body() body: { capability: string }) {
    return this.people.grant(key, body.capability, req.opsIdentity.key);
  }

  @Delete('people/:key/grants/:capability')
  @NeedsOps('people:admin')
  @ApiOperation({ summary: 'Take one away' })
  revoke(@Param('key') key: string, @Param('capability') capability: string) {
    return this.people.revoke(key, capability);
  }

  /**
   * What somebody agreed to, which is never inferred from what they created.
   * Behind people:admin because it is a contract, not a record of work.
   */
  @Get('people/:key/agreement')
  @NeedsOps('people:admin')
  @ApiOperation({ summary: "What this person's agreement entitles them to" })
  agreement(@Param('key') key: string) {
    return this.people.agreementFor(key);
  }

  @Patch('people/:key/agreement')
  @NeedsOps('people:admin')
  @ApiOperation({ summary: 'Record what was agreed' })
  setAgreement(
    @Req() req: { opsIdentity: { key: string } },
    @Param('key') key: string,
    @Body() body: { originatorSharePercent?: number | null; originatorShareMonths?: number | null; agreementNote?: string },
  ) {
    return this.people.setAgreement(key, body, req.opsIdentity.key);
  }

  @Patch('people/:key/active')
  @NeedsOps('people:admin')
  @ApiOperation({ summary: 'Somebody joined, or somebody left' })
  setActive(@Param('key') key: string, @Body() body: { active: boolean }) {
    return this.people.setActive(key, body.active);
  }

  /*
   * `PATCH people/:key/account` WAS HERE AND IS GONE.
   *
   * It took a raw `userId`, which nothing in the ops system can look up — there
   * is no read of the product's user table from in here, deliberately. So the
   * only way to use it was to fetch a UUID out of the database by hand, and no
   * screen ever called it.
   *
   * Connecting an account now happens at `POST /admin/ops/:personKey/account`,
   * which takes an address, is guarded by the platform-admin list, and is
   * reachable by the first person — which this route was not, because it needed
   * `people:admin`, which needs the link it was supposed to create.
   *
   * Two doors to one room where one of them cannot be opened from outside is
   * worse than one door.
   */

  @Get('workstreams')
  @ApiOperation({ summary: 'The standing areas of the company and who owns each' })
  async workstreams() {
    return this.foundation.workstreams();
  }
}
