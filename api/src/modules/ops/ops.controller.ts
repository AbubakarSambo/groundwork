import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OpsCapabilityGuard } from './ops-capability.guard';
import { OpsPeopleService } from './ops-people.service';
import { OpsFoundationService } from './ops-foundation.service';
import { OpsIntegrationService } from './ops-integration.service';
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
  ) {}

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
  @ApiOperation({ summary: 'Sprints, quarters and cycles' })
  async periods() {
    return this.foundation.periods();
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
    @Body() body: { baseUrl?: string; clientId?: string; clientSecret?: string; enabled?: boolean },
  ) {
    return this.integration.configure(body, req.opsIdentity.key);
  }

  /** Sends our objectives and activity across. Nothing here reads back. */
  @Post('integration/push')
  @NeedsOps('integration:manage')
  @ApiOperation({ summary: 'Send this period across to Groundwork' })
  push(@Query('period') period = 'sept-2026-sprint') {
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

  @Patch('people/:key/active')
  @NeedsOps('people:admin')
  @ApiOperation({ summary: 'Somebody joined, or somebody left' })
  setActive(@Param('key') key: string, @Body() body: { active: boolean }) {
    return this.people.setActive(key, body.active);
  }

  @Patch('people/:key/account')
  @NeedsOps('people:admin')
  @ApiOperation({ summary: 'Connect them to the account they sign in with' })
  linkAccount(@Param('key') key: string, @Body() body: { userId: string | null }) {
    return this.people.linkAccount(key, body.userId);
  }

  @Get('workstreams')
  @ApiOperation({ summary: 'The standing areas of the company and who owns each' })
  async workstreams() {
    return this.foundation.workstreams();
  }
}
