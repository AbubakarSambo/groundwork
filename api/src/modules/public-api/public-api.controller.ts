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
