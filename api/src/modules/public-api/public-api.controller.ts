import {
  Controller, Post, Get, Patch, Delete, Body, Param, Query, Headers, Req,
  UseGuards, UnauthorizedException, BadRequestException, HttpCode,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { CredentialsService } from './credentials.service';
import { SubjectsService, SubjectPush } from '../subjects/subjects.service';
import { MachineTokenGuard, RequiresScope, MachineCaller } from './machine-token.guard';
import { IdempotencyService } from './idempotency.service';
import { resolveGrantedScopes } from './scopes';
import { SubjectType } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { ScimService, ScimUser } from '../people/scim.service';
import { BulkImportService } from '../subjects/bulk-import.service';
import { EmbedService } from '../embed/embed.service';
import { EmbedSessionGuard, PanelCaller } from '../embed/embed-session.guard';
import { AssistantService } from '../assistant/assistant.service';
import { HandoverService } from '../grounds/handover.service';
import { OnboardingService } from '../grounds/onboarding.service';
import { resolveReferences } from '../people/an-unresolved-reference-is-a-fact';

/** Short, because a leaked one should stop working before anybody has finished reading the log. */
const TOKEN_TTL_SECONDS = 900;

/**
 * THE INTEGRATION SURFACE, DELIBERATELY SEPARATE FROM EVERYTHING INTERNAL.
 *
 * Internal routes stay free to change shape from one deploy to the next. These cannot: a customer's
 * server calls them, and a breaking change reaches a paying client silently and at the worst
 * possible moment. So they live under their own path with their own version, take their own auth,
 * and return their own shapes - the separation is the point rather than a tidiness preference.
 *
 * The path is absolute rather than relative to the app's global prefix; see main.ts for why the
 * global prefix excludes it.
 */
@ApiTags('Integration API')
/*
 * `@Public()` TAKES THE SESSION GUARD OFF, IT DOES NOT MAKE THE ROUTE OPEN.
 *
 * JwtAuthGuard is global and expects a signed-in person's token; these routes are called by
 * machines that have no session, so it has to stand down. What replaces it is MachineTokenGuard on
 * every route below except the token exchange itself.
 *
 * That pairing is the hazard: forget the second half and the annotation that was meant to swap one
 * authentication for another has simply removed it. A route here with no MachineTokenGuard is
 * unauthenticated and public, on the internet, and it would look exactly like the others. Asserted
 * in every-public-route-is-guarded.spec.ts rather than trusted to review.
 */
@Public()
@Controller('api/org/v1')
export class PublicApiController {
  constructor(
    private readonly jwt: JwtService,
    private readonly credentials: CredentialsService,
    private readonly subjects: SubjectsService,
    private readonly idempotency: IdempotencyService,
    private readonly scim: ScimService,
    private readonly bulk: BulkImportService,
    private readonly embed: EmbedService,
    private readonly assistant: AssistantService,
    private readonly handover: HandoverService,
    private readonly onboarding: OnboardingService,
  ) {}

  /**
   * OAuth 2.0 client credentials. No guard - this is where a caller becomes authenticated, so
   * requiring authentication would be circular.
   */
  @Post('oauth/token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Exchange a client id and secret for a short-lived access token' })
  async token(@Body() dto: { grant_type?: string; client_id?: string; client_secret?: string; scope?: string }) {
    if (dto?.grant_type !== 'client_credentials') {
      throw new BadRequestException('Only the client_credentials grant is supported.');
    }
    const cred = await this.credentials.verify(dto.client_id ?? '', dto.client_secret ?? '');
    /* One message for every way of failing - see CredentialsService.verify. */
    if (!cred) throw new UnauthorizedException('Those credentials were not accepted.');

    const granted = resolveGrantedScopes(cred.scopes, dto.scope);
    if (!granted.ok) {
      throw new BadRequestException(`This credential does not hold: ${granted.unheld.join(', ')}`);
    }

    await this.credentials.stampUse(cred.id);

    const access_token = await this.jwt.signAsync(
      { sub: cred.clientId, org: cred.organizationId, scopes: granted.scopes, typ: 'machine' },
      { expiresIn: TOKEN_TTL_SECONDS },
    );
    return { access_token, token_type: 'Bearer', expires_in: TOKEN_TTL_SECONDS, scope: granted.scopes.join(' ') };
  }

  @Post('subjects')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('subjects:write')
  @ApiOperation({ summary: 'Create or update a subject. Upserts on (org, sourceSystem, externalId).' })
  async pushSubject(
    @Req() req: { machine: MachineCaller },
    @Body() dto: SubjectPush,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.idempotency.run(
      req.machine.organizationId,
      idempotencyKey,
      'POST /subjects',
      /* The body itself, so a retry that is not a retry is refused rather than answered with the
         previous call's response. */
      dto,
      /*
       * Through `find` rather than straight off the upsert, so the response carries `freshness`
       * like every other shape here. The first version returned the raw row and the field simply
       * vanished from the body - a contract field that is present on a read and absent on a write
       * is one a client has to special-case, and they would find out at runtime.
       */
      async () => {
        await this.subjects.push(req.machine.organizationId, dto);
        return this.present(
          await this.subjects.find(req.machine.organizationId, dto.sourceSystem.trim(), dto.externalId.trim()),
        );
      },
    );
  }

  @Post('subjects/bulk')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('subjects:write')
  @ApiOperation({ summary: 'Import many subjects. Returns a jobId; bad rows are skipped and listed.' })
  async bulkSubjects(
    @Req() req: { machine: MachineCaller },
    @Body() dto: { sourceSystem?: string; subjects?: SubjectPush[] },
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (!dto?.sourceSystem?.trim()) throw new BadRequestException('sourceSystem is required on the batch.');
    return this.idempotency.run(
      req.machine.organizationId,
      idempotencyKey,
      'POST /subjects/bulk',
      dto,
      () => this.bulk.start(req.machine.organizationId, dto.sourceSystem!.trim(), dto.subjects ?? []),
    );
  }

  @Get('jobs/:jobId')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('findings:read')
  @ApiOperation({ summary: 'A job, its counts, and every row it could not take' })
  async job(@Req() req: { machine: MachineCaller }, @Param('jobId') jobId: string) {
    return this.bulk.status(req.machine.organizationId, jobId);
  }

  @Get('subjects/:externalId')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('findings:read')
  @ApiOperation({ summary: 'Read one subject as we currently hold it, with its freshness' })
  async getSubject(
    @Req() req: { machine: MachineCaller },
    @Param('externalId') externalId: string,
    @Query('sourceSystem') sourceSystem: string,
  ) {
    if (!sourceSystem) throw new BadRequestException('sourceSystem is required - an external id is only unique within one.');
    const row = await this.subjects.find(req.machine.organizationId, sourceSystem, externalId);
    if (!row) throw new BadRequestException('No such subject.');
    return this.withPeople(req.machine.organizationId, row);
  }

  @Get('subjects')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('findings:read')
  @ApiOperation({ summary: 'List subjects held for this organisation' })
  async listSubjects(@Req() req: { machine: MachineCaller }, @Query('type') type?: string) {
    const t = type ? (SubjectType as any)[type.toUpperCase()] : undefined;
    const rows = await this.subjects.list(req.machine.organizationId, { type: t });
    return { data: rows.map((r) => this.present(r)) };
  }

  @Delete('subjects/:externalId')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('subjects:write')
  @ApiOperation({ summary: 'Mark a subject deleted at source. Soft: findings that reference it stay readable.' })
  async deleteSubject(
    @Req() req: { machine: MachineCaller },
    @Param('externalId') externalId: string,
    @Query('sourceSystem') sourceSystem: string,
  ) {
    if (!sourceSystem) throw new BadRequestException('sourceSystem is required.');
    return this.subjects.markSourceDeleted(req.machine.organizationId, sourceSystem, externalId);
  }

  /**
   * THE HANDSHAKE THE WIDGET MAKES ON EVERY LOAD.
   *
   * UNGUARDED, and that is the correction rather than an omission. This is called by a browser on
   * a page in the customer's application, which holds no credential of ours and must not - a
   * machine secret in a widget is a machine secret in developer tools. The identity token their
   * server signed IS the authentication. See EmbedService.session.
   */
  @Post('embed/session')
  @HttpCode(200)
  @ApiOperation({ summary: 'Exchange a customer-signed identity token for a Groundwork panel session' })
  async embedSession(@Body() dto: { token?: string }) {
    if (!dto?.token) throw new BadRequestException('token is required.');
    return this.embed.session(dto.token);
  }

  @Get('embed/opening')
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'What the panel draws before anybody types' })
  async embedOpening(@Req() req: { panel: PanelCaller }) {
    return this.embed.openingFor(req.panel.organizationId, req.panel.personId);
  }

  /**
   * ONE FRONT DOOR. No menu, no mode selection - the router reads intent and picks a lane.
   *
   * Guarded by the PANEL's session rather than a machine credential: every lane is scoped to the
   * person asking, and a machine token carries an organisation and nobody in particular.
   */
  @Post('chat')
  @HttpCode(200)
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'Ask the assistant. Returns typed blocks, not a string.' })
  async chat(@Req() req: { panel: PanelCaller }, @Body() dto: { message?: string }) {
    return this.assistant.respond(req.panel.organizationId, req.panel.personId, dto?.message ?? '');
  }

  /**
   * A ROLE CHANGING HANDS.
   *
   * The brief is built the moment the assignment ends, because §13's ageing rule removes turn
   * content after its window - a brief built later is built from data already gone. So this is a
   * write that produces a record, not a request for one to be generated on read.
   */
  @Post('role-assignments')
  @HttpCode(201)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('graph:write')
  @ApiOperation({ summary: 'Record who holds a role. Ending one with a successor builds their handover brief.' })
  async createRoleAssignment(
    @Req() req: { machine: MachineCaller },
    @Body() dto: { personExternalId: string; roleName: string; startedAt?: string },
  ) {
    if (!dto?.personExternalId || !dto?.roleName) {
      throw new BadRequestException('personExternalId and roleName are both required.');
    }
    return this.handover.startAssignment(
      req.machine.organizationId, dto.personExternalId, dto.roleName,
      dto.startedAt ? new Date(dto.startedAt) : undefined,
    );
  }

  @Post('role-assignments/:id/end')
  @HttpCode(200)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('graph:write')
  @ApiOperation({ summary: 'End an assignment. With a successor, the handover brief is built now.' })
  async endRoleAssignment(
    @Req() req: { machine: MachineCaller },
    @Param('id') id: string,
    @Body() dto: { successorPersonExternalId?: string; endedAt?: string },
  ) {
    return this.handover.endAssignment(req.machine.organizationId, id, {
      successorPersonExternalId: dto?.successorPersonExternalId,
      ...(dto?.endedAt ? { endedAt: new Date(dto.endedAt) } : {}),
    });
  }

  @Get('handovers/:roleAssignmentId')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('handovers:read')
  @ApiOperation({ summary: 'The brief as it was built. Never regenerated - it describes a moment.' })
  async getHandover(@Req() req: { machine: MachineCaller }, @Param('roleAssignmentId') id: string) {
    return this.handover.get(req.machine.organizationId, id);
  }

  @Post('onboarding/tracks')
  @HttpCode(200)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('graph:write')
  @ApiOperation({ summary: 'Define what somebody new to a role has to get through. Replaces the track.' })
  async defineTrack(
    @Req() req: { machine: MachineCaller },
    @Body() dto: { roleName: string; name: string; gates: { key: string; name: string; description?: string; required?: boolean }[] },
  ) {
    return this.onboarding.defineTrack(req.machine.organizationId, dto?.roleName, dto?.name, dto?.gates);
  }

  @Get('onboarding/:personExternalId')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('findings:read')
  @ApiOperation({ summary: 'Where somebody has got to, and what is left.' })
  async onboardingStatus(@Req() req: { machine: MachineCaller }, @Param('personExternalId') id: string) {
    return this.onboarding.statusFor(req.machine.organizationId, id);
  }

  @Post('onboarding/:personExternalId/gates/:gateKey')
  @HttpCode(200)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('graph:write')
  @ApiOperation({ summary: 'Mark a gate done, waived, or back to pending.' })
  async markGate(
    @Req() req: { machine: MachineCaller },
    @Param('personExternalId') personExternalId: string,
    @Param('gateKey') gateKey: string,
    @Body() dto: { state?: string; evidenceRef?: string },
  ) {
    const state = (dto?.state ?? 'DONE').toUpperCase();
    if (!['PENDING', 'DONE', 'WAIVED'].includes(state)) {
      throw new BadRequestException('state must be PENDING, DONE or WAIVED.');
    }
    return this.onboarding.mark(
      req.machine.organizationId, personExternalId, gateKey, state as any, dto?.evidenceRef,
    );
  }

  /**
   * SCIM 2.0. The path is theirs, not ours - an IdP is configured with a base URL and appends
   * /Users itself, so the shape has to be exactly what the standard says.
   */
  @Post('scim/v2/Users')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('graph:write')
  @ApiOperation({ summary: 'Create or update a person. Upserts on externalId - a mover is not a new person.' })
  async scimUpsert(@Req() req: { machine: MachineCaller }, @Body() dto: ScimUser) {
    const { row, created } = await this.scim.upsert(req.machine.organizationId, req.machine.clientId, dto);
    return this.presentPerson(row, created);
  }

  @Patch('scim/v2/Users/:externalId')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('graph:write')
  @ApiOperation({ summary: 'Patch a person. The deprovisioning op every IdP sends is active:false.' })
  async scimPatch(@Req() req: { machine: MachineCaller }, @Param('externalId') externalId: string, @Body() body: any) {
    return this.presentPerson(await this.scim.patch(req.machine.organizationId, req.machine.clientId, externalId, body));
  }

  @Get('scim/v2/Users/:externalId')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('findings:read')
  @ApiOperation({ summary: 'Read one person as we hold them' })
  async scimGet(@Req() req: { machine: MachineCaller }, @Param('externalId') externalId: string) {
    const row = await this.scim.find(req.machine.organizationId, req.machine.clientId, externalId);
    if (!row) throw new BadRequestException('No such person.');
    return this.presentPerson(row);
  }

  @Get('scim/v2/Users')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('findings:read')
  @ApiOperation({ summary: 'List people. Inactive are excluded unless asked for - they are kept, never deleted.' })
  async scimList(@Req() req: { machine: MachineCaller }, @Query('includeInactive') includeInactive?: string) {
    const rows = await this.scim.list(req.machine.organizationId, { includeInactive: includeInactive === 'true' });
    return { totalResults: rows.length, Resources: rows.map((r) => this.presentPerson(r)) };
  }

  /** Allow-list, same reasoning as the subject serialiser below. */
  private presentPerson(p: any, created?: boolean) {
    return {
      externalId: p.externalId,
      userName: p.userName,
      displayName: p.displayName,
      name: { givenName: p.givenName, familyName: p.familyName },
      email: p.email,
      title: p.title,
      department: p.department,
      timezone: p.timezone,
      managerExternalId: p.managerExternalId,
      active: p.active,
      deactivatedAt: p.deactivatedAt,
      syncedAt: p.syncedAt,
      ...(created === undefined ? {} : { created }),
    };
  }

  /**
   * THE SERIALISER, AND IT IS AN ALLOW-LIST.
   *
   * A screen can omit a field by not drawing it; JSON cannot. So what leaves is named here rather
   * than filtered here - a deny-list would let every column added later escape by default, which is
   * exactly how an internal id or a hash ends up in somebody else's logs. Nothing reaches a
   * customer that is not written on this line.
   */
  private present(s: any, refs?: ReturnType<typeof resolveReferences>) {
    return {
      externalId: s.externalId,
      sourceSystem: s.sourceSystem,
      type: String(s.type).toLowerCase(),
      title: s.title,
      measure: s.measure,
      target: s.target,
      ownerExternalId: s.ownerExternalId,
      contributorExternalIds: s.contributorExternalIds ?? [],
      parentExternalId: s.parentExternalId,
      startDate: s.startDate,
      dueDate: s.dueDate,
      status: s.status,
      authoredBy: s.authoredBy,
      syncedAt: s.syncedAt,
      sourceDeletedAt: s.sourceDeletedAt,
      freshness: s.freshness,
      /*
       * Present and empty rather than absent when everything resolved, so a client reads one shape
       * either way. See an-unresolved-reference-is-a-fact.ts for why an id we cannot resolve is
       * kept and reported rather than dropped.
       */
      ...(refs ? { owner: refs.owner, contributors: refs.contributors, unresolvedReferences: refs.unresolved } : {}),
    };
  }

  /** Resolve a subject's people, for the reads that show them. */
  private async withPeople(organizationId: string, subject: any) {
    const ids = [
      subject.ownerExternalId,
      ...(Array.isArray(subject.contributorExternalIds) ? subject.contributorExternalIds : []),
    ].filter(Boolean);
    const { found } = await this.scim.resolve(organizationId, ids);
    return this.present(subject, resolveReferences(subject, found as any));
  }
}
