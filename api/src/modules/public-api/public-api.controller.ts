import { ONE_FILE } from '../../common/the-most-a-file-may-weigh';
import {
  UseInterceptors,
  UploadedFile,
  Controller, Post, Get, Put, Patch, Delete, Body, Param, Query, Headers, Req,
  UseGuards, UnauthorizedException, BadRequestException, HttpCode, ForbiddenException } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiExcludeEndpoint, ApiConsumes } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { AMessageIntoACheckInDto } from '../../common/dto';
import { CredentialsService } from './credentials.service';
import { SubjectsService, SubjectPush } from '../subjects/subjects.service';
import { ApprovedOrMachineGuard } from './approved-or-machine.guard';
import { MachineTokenGuard, RequiresScope, MachineCaller } from './machine-token.guard';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyInterceptor } from './idempotency.interceptor';
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
import { ScenariosService } from '../detectors/scenarios.service';
import { mayUseTheApi, whyTheApiIsRefused } from './access-is-asked-for-not-bought';
import { PrismaService } from '../prisma/prisma.service';
import { GroundsByApiService } from './grounds-by-api.service';
import { RoundDigestService } from '../email/round-digest.service';
import { resolveReferences } from '../people/an-unresolved-reference-is-a-fact';
import { WhatHappenedWithACustomerService } from './what-happened-with-a-customer.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { DraftsService } from '../drafts/drafts.service';
import { ACheckInACustomerCanRunService } from './a-check-in-a-customer-can-run.service';
import { CommitmentsByApiService } from './commitments-by-api.service';
import { TodosByApiService } from './todos-by-api.service';
import { ReportsForMyPeopleService } from '../reports/reports-for-my-people.service';
import { ReviewsComingUpService } from '../reports/reviews-coming-up.service';
import { THE_SEQUENCE, VOCABULARY, WORDS_THAT_DIFFER, THE_PANEL, THE_ERROR_SHAPE } from './what-you-need-to-know-before-you-start';
import { SENDABLE_EVENTS } from '../webhooks/events-we-can-actually-send';

/** Short, because a leaked one should stop working before anybody has finished reading the log. */
/* Five minutes, from fifteen: the guard now refuses a revoked credential at once, and a short life is the second line (A10). */
const TOKEN_TTL_SECONDS = 300;

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
@UseInterceptors(IdempotencyInterceptor)
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
    private readonly scenarios: ScenariosService,
    private readonly digests: RoundDigestService,
    private readonly prisma: PrismaService,
    private readonly groundsByApi: GroundsByApiService,
    private readonly whatHappened: WhatHappenedWithACustomerService,
    private readonly drafts: DraftsService,
    private readonly checkIns: ACheckInACustomerCanRunService,
    private readonly commitments: CommitmentsByApiService,
    private readonly todos: TodosByApiService,
    private readonly myPeople: ReportsForMyPeopleService,
    private readonly reviews: ReviewsComingUpService,
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

    /*
     * APPROVED ONLY, checked here rather than at credential issue - access withdrawn after a
     * credential was issued has to stop working, and a short-lived token means that happens within
     * one token lifetime instead of waiting for somebody to remember to revoke.
     *
     * It used to read the subscription. See `access-is-asked-for-not-bought.ts` for why it no
     * longer does: what a customer pays for and what a customer may connect to are two decisions.
     */
    const access = await this.prisma.apiAccessRequest.findUnique({
      where: { organizationId: cred.organizationId },
      select: { status: true },
    });
    if (!mayUseTheApi(access)) throw new ForbiddenException(whyTheApiIsRefused(access));

    await this.credentials.stampUse(cred.id);

    const access_token = await this.jwt.signAsync(
      {
        sub: cred.clientId, org: cred.organizationId, scopes: granted.scopes, typ: 'machine',
        /* WHICH SYSTEM, travelling separately from WHICH CREDENTIAL. The roster is keyed on the
           system, so a rotated credential has to arrive saying the same thing as the one it
           replaced — see `people/whose-roster-is-this.ts`. */
        src: cred.sourceSystem,
        /* The fence travels IN the token, so it cannot be stale relative to the scopes it came with
           and a revoked-then-reissued credential cannot keep an old boundary. */
        fence: cred.boundToPersonExternalIds ?? [],
      },
      { expiresIn: TOKEN_TTL_SECONDS },
    );
    return { access_token, token_type: 'Bearer', expires_in: TOKEN_TTL_SECONDS, scope: granted.scopes.join(' ') };
  }

  /**
   * WHAT YOU NEED TO KNOW BEFORE YOU START.
   *
   * Deliberately unauthenticated. Somebody reading this has a client id they
   * are about to use for the first time, and making them exchange it for a
   * token before they can find out what the calls want puts the answer behind
   * the thing they are trying to get right. There is nothing here that is not
   * already in an error message.
   */
  @Get('how-to-connect')
  @Public()
  @UseGuards(ApprovedOrMachineGuard)
  @ApiOperation({ summary: 'The six calls, the closed sets, and what usually goes wrong' })
  howToConnect() {
    return {
      sequence: THE_SEQUENCE,
      vocabulary: VOCABULARY,
      wordsThatDiffer: WORDS_THAT_DIFFER,
      webhookEvents: SENDABLE_EVENTS,
      thePanel: THE_PANEL,
      errors: THE_ERROR_SHAPE,
      says: 'Six calls. One of them is a person signing in, which nothing else will tell you.',
    };
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
      /* An upsert on the caller's own key: a retry without a header is still a retry - including one
         sent after the credential was rotated, so the key follows the source system, never the
         client id. See IdempotencyService.run and a-rotated-credential-is-the-same-roster.spec.ts. */
      { deriveKeyFrom: req.machine.sourceSystem },
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
  async embedOpening(@Req() req: { panel: PanelCaller }, @Query('about') about?: string) {
    /* `about` is what the host page said the person is looking at — see
       embed/what-they-are-looking-at.ts. It is a claim from somebody else's page, checked against
       this organisation before it changes anything. */
    return this.embed.openingFor(req.panel.organizationId, req.panel.personId, about);
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
  async chat(@Req() req: { panel: PanelCaller }, @Body() dto: AMessageIntoACheckInDto) {
    return this.assistant.respond(req.panel.organizationId, req.panel.personId, dto.message);
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

  @Get('suggestions')
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'Conversations the record suggests, waiting on this person to decide.' })
  async suggestions(@Req() req: { panel: PanelCaller }) {
    return this.scenarios.pendingFor(req.panel.organizationId, req.panel.externalId);
  }

  /**
   * A HUMAN SAYING YES OR NO. The only thing that turns a suggestion into a conversation.
   *
   * Guarded by the PANEL session rather than a machine credential, which is the whole point: a
   * machine token carries an organisation and nobody in particular, and "a human opens it" cannot be
   * satisfied by a server-to-server call.
   */
  @Post('suggestions/:id')
  @HttpCode(200)
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'Accept or decline a suggested conversation.' })
  async decideSuggestion(
    @Req() req: { panel: PanelCaller },
    @Param('id') id: string,
    @Body() dto: { accept?: boolean },
  ) {
    if (typeof dto?.accept !== 'boolean') {
      throw new BadRequestException('accept must be true or false. There is no third answer.');
    }
    return this.scenarios.decide(req.panel.organizationId, id, req.panel.externalId, dto.accept);
  }

  @Get('email-preferences')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('graph:write')
  @ApiOperation({ summary: 'What somebody has chosen to receive by mail.' })
  async getEmailPreferences(
    @Req() req: { machine: MachineCaller },
    @Query('participantExternalId') id: string,
  ) {
    if (!id) throw new BadRequestException('participantExternalId is required.');
    const p = await this.digests.prefsFor(req.machine.organizationId, id);
    /*
     * The token never leaves. It is the whole of the authentication on a link that works without
     * signing in, so handing it to an integration would let anybody holding a machine credential
     * unsubscribe anybody - which is the one thing §13D.3 says an admin may not do.
     */
    const { unsubscribeToken, ...safe } = p;
    return safe;
  }

  @Post('email-preferences')
  @HttpCode(200)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('graph:write')
  @ApiOperation({ summary: 'Set what somebody receives by mail. Cannot re-subscribe somebody who opted out.' })
  async setEmailPreferences(
    @Req() req: { machine: MachineCaller },
    @Body() dto: { participantExternalId: string; roundDigest?: boolean; nudges?: boolean;
      quietBeforeHour?: number; quietAfterHour?: number },
  ) {
    if (!dto?.participantExternalId) throw new BadRequestException('participantExternalId is required.');
    return this.digests.setPreferences(req.machine.organizationId, dto.participantExternalId, dto);
  }

  /**
   * OPEN A GROUNDWORK FROM SOMEBODY ELSE'S PRODUCT.
   *
   * The front door that did not exist. `POST /checkins` reads as though it created one and does not
   * - it links an existing ground to an objective - so an integration could push its whole
   * organisation in and never start a conversation about any of it.
   *
   * What comes out is a ground with no API-ness about it: the same scenario pack, the same engine,
   * the same report at the end, because nothing downstream asks how it was made.
   */
  @Post('grounds')
  @HttpCode(201)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('grounds:write')
  @ApiOperation({ summary: 'Open a check-in. Same engine, same scenario setup, same report as one opened in the product.' })
  async openGround(@Req() req: { machine: MachineCaller }, @Body() dto: any) {
    return this.groundsByApi.open(req.machine.organizationId, dto, req.machine);
  }

  /**
   * THE REPORT, WHICH WAS GENERATED AND UNREACHABLE.
   *
   * Its own scope rather than folded into `findings:read`, for the same reason handovers got one: a
   * report is a great deal more than a finding, and an integration granted the right to read
   * findings must not silently receive everybody's synthesis as well.
   */
  @Get('grounds/:groundId/report')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('reports:read')
  @ApiOperation({ summary: 'The report for a completed round.' })
  async getReport(
    @Req() req: { machine: MachineCaller },
    @Param('groundId') groundId: string,
    @Query('as') asPersonExternalId: string,
  ) {
    return this.groundsByApi.report(req.machine.organizationId, groundId, asPersonExternalId, req.machine);
  }

  /**
   * SEED WHAT WAS ALREADY AGREED.
   *
   * So the interview opens with "your agreed target is six paying clients, how is that going"
   * instead of "what do you think your target is". The principle is that Groundwork starts from the
   * existing agreement rather than pretending none exists - and it still lets somebody say the
   * agreement is wrong, was never shown to them, or has been overtaken.
   */
  /**
   * WHAT WOULD HAVE TO BE TRUE FOR AN OBJECTIVE TO BE DONE.
   *
   * `subjects:write`, not a scope of its own: a criterion is part of the objective it belongs to,
   * and anybody allowed to change the objective is already allowed to change what finishing it
   * means. A separate scope would suggest these can be governed apart, and they cannot.
   */
  @Put('subjects/:externalId/acceptance-criteria')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('subjects:write')
  @ApiOperation({ summary: 'Set what would have to be true for an objective to be done.' })
  async setAcceptanceCriteria(
    @Req() req: { machine: MachineCaller },
    @Param('externalId') externalId: string,
    @Body() dto: { criteria: { text: string }[] },
  ) {
    return this.groundsByApi.setAcceptanceCriteria(req.machine.organizationId, externalId, dto?.criteria ?? []);
  }

  @Get('subjects/:externalId/acceptance-criteria')
  @UseGuards(MachineTokenGuard)
  /*
   * `findings:read`, WHICH IS THE SCOPE READING A SUBJECT ALREADY TAKES. I wrote `subjects:read`
   * first - a scope that does not exist, so the route would have failed closed at runtime and been
   * unreachable for anybody. Reading what an objective requires is reading the objective.
   */
  @RequiresScope('findings:read')
  @ApiOperation({ summary: 'Where an objective stands against what was agreed.' })
  async acceptanceCriteria(
    @Req() req: { machine: MachineCaller },
    @Param('externalId') externalId: string,
  ) {
    return this.groundsByApi.acceptanceCriteria(req.machine.organizationId, externalId);
  }

  @Post('subjects/:externalId/acceptance-criteria/:ordinal/met')
  @HttpCode(200)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('subjects:write')
  @ApiOperation({ summary: 'Mark one criterion met, saying what showed it.' })
  async markCriterionMet(
    @Req() req: { machine: MachineCaller },
    @Param('externalId') externalId: string,
    @Param('ordinal') ordinal: string,
    @Body() dto: { because: string; byExternalId?: string },
  ) {
    return this.groundsByApi.markCriterionMet(
      req.machine.organizationId, externalId, Number(ordinal), dto?.because ?? '', dto?.byExternalId,
    );
  }

  @Post('grounds/:groundId/objectives')
  @HttpCode(200)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('grounds:write')
  @ApiOperation({ summary: 'Seed already-agreed objectives, commitments and targets onto a check-in.' })
  async seedObjectives(
    @Req() req: { machine: MachineCaller },
    @Param('groundId') groundId: string,
    @Body() dto: { objectives: any[] },
  ) {
    return this.groundsByApi.seedObjectives(req.machine.organizationId, groundId, dto?.objectives);
  }

  /**
   * LIVE EVIDENCE. What the customer's own systems say is happening right now.
   *
   * The difference between a check-in and a form: without this the interview asks whether testing
   * has started, and with it, what makes the three untested scenarios different from the fourteen
   * that passed.
   */
  /**
   * WHAT HAPPENED WITH A CUSTOMER, from a system that already records it.
   *
   * `PUT /evidence` above attaches a figure to an objective - "committed 1.1m" against a pipeline
   * target. This is the other half: the individual things that happened, so a check-in can ask
   * about the nine visits with no next step rather than asking how many visits there were.
   *
   * `graph:write`, the same scope as evidence, because it is the same kind of act: the customer's
   * own systems telling us what their own systems know.
   */
  /**
   * `graph:write`, the scope for facts the customer's systems assert about their own world - the
   * same one subjects and interactions take. A metric is one more of those.
   */
  // --- Running a check-in from inside somebody else's application ----------
  //
  // The one thing this product IS, and the one thing this API could not do: a
  // customer could push every objective and read every report without ever
  // holding a session. These add no rules — every refusal belongs to the
  // conversation service and stays there.
  //
  // Guarded by the PANEL's session rather than a machine credential, for the
  // same reason `/chat` is: a check-in belongs to one person, and a machine
  // token carries an organisation and nobody in particular.

  /**
   * What is waiting for the person this panel is open for.
   *
   * The route without which none of the others can be called — a customer's
   * page has a person, not a check-in id.
   */
  @Get('check-ins/mine')
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: "The check-ins waiting for this panel's person, and the ones not open yet" })
  async myCheckIns(@Req() req: { panel: PanelCaller }) {
    return this.checkIns.whatIsWaitingFor(req.panel.organizationId, req.panel.personId);
  }

  /**
   * WHAT IS WAITING ON THIS PERSON TO START, as the named lead.
   *
   * A ground created through this API sits at AWAITING_LEAD until the person it
   * was set up for has read the context and said yes. There was no way to do
   * that here, so a customer could create a ground from their own system and the
   * lead had to log into ours to start it.
   */
  @Get('grounds/awaiting-me')
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'Check-ins set up for this person that have not started yet' })
  async awaitingMe(@Req() req: { panel: PanelCaller }) {
    return this.checkIns.whatIsWaitingOnYouToStart(req.panel.organizationId, req.panel.personId);
  }

  /**
   * The named lead confirms it, and only then does it begin.
   *
   * Panel-authenticated. A machine credential doing this would be a customer's
   * server deciding on somebody's behalf that they have read the context and
   * agree with it, which is the one thing this step exists to prevent.
   */
  @Post('grounds/:id/confirm-lead')
  @HttpCode(200)
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'The named lead reads what was set up for them and starts it' })
  async confirmLead(
    @Req() req: { panel: PanelCaller },
    @Param('id') id: string,
    @Body() dto: { brief?: string; managingOnly?: boolean; remit?: string },
  ) {
    return this.checkIns.confirmAsLead(req.panel.organizationId, req.panel.personId, id, dto ?? {});
  }

  /** Open one. Returns the opening question. */
  @Post('check-ins/:id/open')
  @HttpCode(200)
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'Open a check-in and get its first question' })
  async openCheckIn(@Req() req: { panel: PanelCaller }, @Param('id') id: string) {
    return this.checkIns.open(req.panel.organizationId, req.panel.personId, id);
  }

  /** Say something in it. */
  @Post('check-ins/:id/messages')
  @HttpCode(200)
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'Answer in a check-in' })
  async sayInCheckIn(
    @Req() req: { panel: PanelCaller },
    @Param('id') id: string,
    @Body() dto: AMessageIntoACheckInDto,
  ) {
    return this.checkIns.say(req.panel.organizationId, req.panel.personId, id, dto.message);
  }

  /**
   * OPEN A CHECK-IN FROM THE PANEL.
   *
   * The panel could answer in a check-in and never start one, so somebody with nothing waiting had
   * nowhere to go: every sentence fell to the assistant's router, which is a different thing in the
   * same box. Her words - it is meant to act exactly like the check-ins on our system, with more.
   *
   * The acting person comes from the SESSION and cannot be sent in the body, which is the whole
   * difference between this and the machine route beside it. A customer's server naming any person
   * it likes is a credential doing its job; a browser widget doing it is somebody opening a record
   * in a colleague's name.
   */
  @Post('check-ins')
  @HttpCode(201)
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'Open a check-in as the person this panel session belongs to' })
  async openCheckInFromPanel(
    @Req() req: { panel: PanelCaller },
    @Body() dto: { label?: string; scenario?: string; moment?: string; timelineDays?: number; runsUntilEnded?: boolean; cadence?: string; participants?: { personExternalId: string; roleAsDescribed?: string }[] },
  ) {
    return this.checkIns.openACheckIn(req.panel.organizationId, req.panel.personId, dto);
  }

  /**
   * ADD SOMEBODY TO THE ORGANISATION, FROM THE PANEL.
   *
   * Her call, knowing what it means: a panel session can register a person the way a directory sync
   * does. The thing that makes it safe is the queue built earlier today - a person added this way is
   * a directory entry, and the moment they accept an invitation to a check-in they are queued for an
   * admin rather than becoming a member. So this creates somebody to invite, not somebody who is in.
   */
  @Post('people')
  @HttpCode(201)
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'Register a person, from the panel. They are queued when they accept anything. `department` is optional and never inferred.' })
  async addPersonFromPanel(
    @Req() req: { panel: PanelCaller },
    @Body() dto: { email?: string; displayName?: string; externalId?: string; phone?: string; department?: string },
  ) {
    return this.checkIns.addAPerson(req.panel.organizationId, req.panel.personId, dto);
  }

  /**
   * ATTACH SOMETHING TO IT.
   *
   * Same shape as the product's own upload - multipart, one file, ten megabytes - because it is
   * the same service behind it. A second upload path would be a second set of rules about
   * transcripts and consent, and those rules are the reason the first one is careful.
   */
  @Post('check-ins/:id/documents')
  @HttpCode(200)
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'Attach a document to a check-in. PDF, Word, Excel, PowerPoint, text.' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', ONE_FILE))
  async attachToCheckIn(
    @Req() req: { panel: PanelCaller },
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { consentConfirmed?: string | boolean; uploaderNote?: string },
  ) {
    /* Multipart, so a boolean arrives as the string "true". */
    const confirmed = body?.consentConfirmed === true || body?.consentConfirmed === 'true';
    return this.checkIns.attach(req.panel.organizationId, req.panel.personId, id, file, confirmed, body?.uploaderNote);
  }

  /** Finish it. What was said is released with everybody else's, not before. */
  /** What came of it, for the person it belongs to. Session reports are per check-in; the shared report is under grounds. */
  @Get('check-ins/:id/report')
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: "This person's own session report for a check-in they completed" })
  async myCheckInReport(@Req() req: { panel: PanelCaller }, @Param('id') id: string) {
    return this.checkIns.report(req.panel.organizationId, req.panel.personId, id);
  }

  @Post('check-ins/:id/complete')
  @HttpCode(200)
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'Finish a check-in' })
  async completeCheckIn(@Req() req: { panel: PanelCaller }, @Param('id') id: string) {
    return this.checkIns.complete(req.panel.organizationId, req.panel.personId, id);
  }

  /**
   * PUT A DOCUMENT IN, FROM THE PANEL.
   *
   * It arrives private — visible to the uploader alone — and the conversation asks who it is for
   * afterwards. Opening it to a team is a thing somebody says, never a default.
   */
  @Post('grounds/:groundId/documents')
  @HttpCode(201)
  @UseGuards(EmbedSessionGuard)
  @UseInterceptors(FileInterceptor('file', ONE_FILE))
  @ApiOperation({ summary: 'Add a document to a check-in. It arrives private.' })
  async putADocumentIn(
    @Req() req: { panel: PanelCaller },
    @Param('groundId') groundId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { uploaderNote?: string; visibility?: string },
  ) {
    if (!file) throw new BadRequestException('No file was sent.');
    return this.checkIns.putADocumentIn(
      req.panel.organizationId,
      req.panel.personId,
      groundId,
      file,
      body?.uploaderNote,
      body?.visibility,
    );
  }

  /** Who can see a document already on a check-in. OPEN is everybody on it; OWN is only the uploader. */
  @Patch('grounds/:groundId/documents/:docId/visibility')
  @HttpCode(200)
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'Change who can see a document you put on a check-in' })
  async setDocumentVisibility(
    @Req() req: { panel: PanelCaller },
    @Param('groundId') groundId: string,
    @Param('docId') docId: string,
    @Body() dto: { visibility?: string },
  ) {
    return this.checkIns.setDocumentVisibility(req.panel.organizationId, req.panel.personId, groundId, docId, dto?.visibility ?? '');
  }

  /** What success looks like, said by the person for their own check-in. */
  @Post('check-ins/:id/success-looks-like')
  @HttpCode(200)
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'State, in your words, what success looks like on this check-in' })
  async statedSuccess(@Req() req: { panel: PanelCaller }, @Param('id') id: string, @Body() dto: { text?: string }) {
    return this.checkIns.statedSuccess(req.panel.organizationId, req.panel.personId, id, dto?.text ?? '');
  }

  /*
   * COMMITMENTS HAVE A DOOR OF THEIR OWN.
   *
   * They were only ever made by saying them in the chat and only ever read by asking. A customer's
   * own system could neither list what somebody had promised nor record one it already knew about.
   * Panel routes act as the signed-in person; the machine route reads for a named person.
   */
  @Get('commitments/mine')
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'What this person has said they will do, open first' })
  async myCommitments(@Req() req: { panel: PanelCaller }) {
    return this.commitments.mine(req.panel.organizationId, req.panel.personId);
  }

  @Post('commitments')
  @HttpCode(201)
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'Record a commitment in your own name' })
  async addCommitment(
    @Req() req: { panel: PanelCaller },
    @Body() dto: { text?: string; dueSaid?: string; dueAt?: string; subjectExternalId?: string },
  ) {
    return this.commitments.add(req.panel.organizationId, req.panel.personId, dto ?? {});
  }

  @Post('commitments/:id/done')
  @HttpCode(200)
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'Mark one of your commitments done' })
  async commitmentDone(@Req() req: { panel: PanelCaller }, @Param('id') id: string) {
    return this.commitments.done(req.panel.organizationId, req.panel.personId, id);
  }

  /* TO-DOS. Yours alone: panel routes only, no machine route, because a to-do is a note to yourself. */
  @Get('todos/mine')
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'Your own list, open first' })
  async myTodos(@Req() req: { panel: PanelCaller }) {
    return this.todos.mine(req.panel.organizationId, req.panel.personId);
  }

  @Post('todos')
  @HttpCode(201)
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'Put something on your own list' })
  async addTodo(@Req() req: { panel: PanelCaller }, @Body() dto: { text?: string; dueSaid?: string; dueAt?: string }) {
    return this.todos.add(req.panel.organizationId, req.panel.personId, dto ?? {});
  }

  @Post('todos/:id/done')
  @HttpCode(200)
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: 'Tick one off' })
  async todoDone(@Req() req: { panel: PanelCaller }, @Param('id') id: string) {
    return this.todos.done(req.panel.organizationId, req.panel.personId, id);
  }

  @Get('people/:personExternalId/commitments')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('graph:read')
  @ApiOperation({ summary: "A named person's commitments, for the system that holds their work" })
  async commitmentsOf(@Req() req: { machine: MachineCaller }, @Param('personExternalId') personExternalId: string) {
    return this.commitments.forPerson(req.machine.organizationId, personExternalId, req.machine);
  }

  /**
   * WHAT IS HAPPENING WITH THE PEOPLE WHO REPORT TO THEM.
   *
   * Links to released reports, never the reports themselves — a manager opens each one through the
   * route that already decides what a report shows. Assembling content here would be a second place
   * a report is rendered, and the second place is where the redaction is eventually forgotten.
   *
   * Panel-authenticated: it is a question about somebody's own people, answered for the person
   * asking. A machine credential naming an organisation and nobody in particular has no reporting
   * line to read.
   */
  @Get('reports/my-people')
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: "Released reports about the people who report to this person" })
  async reportsForMyPeople(@Req() req: { panel: PanelCaller }) {
    const who = await this.myPeople.whoTheyAre(req.panel.organizationId, req.panel.personId);
    return this.myPeople.forTheirPeople(req.panel.organizationId, who);
  }

  /**
   * WHEN A REVIEW FALLS DUE FOR SOMEBODY.
   *
   * A date from the customer's own system, so the record this product already produces can arrive
   * before the conversation rather than after it. Groundwork does not evaluate anybody and this does
   * not make it start — it is a date, and what it triggers is a report that is unchanged.
   *
   * Machine-authenticated, because this is their HR system telling us something rather than a person
   * asking for anything.
   */
  @Post('evaluations-due')
  @HttpCode(200)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('graph:write')
  @ApiOperation({ summary: 'Record when a review falls due for somebody, from your own system' })
  async noteEvaluationDue(
    @Req() req: { machine: MachineCaller },
    @Body() dto: { personExternalId?: string; dueOn?: string; kind?: string; source?: string },
  ) {
    if (!dto?.personExternalId || !dto?.dueOn || !dto?.kind) {
      throw new BadRequestException('personExternalId, dueOn and kind are all required.');
    }
    const dueOn = new Date(dto.dueOn);
    if (Number.isNaN(dueOn.getTime())) throw new BadRequestException('dueOn is not a date.');

    return this.reviews.note({
      organizationId: req.machine.organizationId,
      personExternalId: dto.personExternalId,
      dueOn,
      kind: dto.kind,
      /* Where it came from, so a wrong date can be traced rather than argued about. Defaults to the
         credential, which is at least true. */
      source: dto.source?.trim() || req.machine.sourceSystem,
    });
  }

  /** Their own transcript, and never anybody else's. */
  @Get('check-ins/:id/transcript')
  @UseGuards(EmbedSessionGuard)
  @ApiOperation({ summary: "One person's own check-in transcript" })
  async checkInTranscript(@Req() req: { panel: PanelCaller }, @Param('id') id: string) {
    return this.checkIns.transcript(req.panel.organizationId, req.panel.personId, id);
  }

  // --- Agreeing an objective before it becomes one -------------------------
  //
  // The drafting flow existed, refused to seed while anybody still disagreed,
  // and was reachable by nothing — no route in this API and no screen. So the
  // one part of the product that makes an objective something people agreed
  // rather than something they were given could not be used by a customer.

  /**
   * Open a draft. It is not an objective and does not appear as one.
   */
  @Post('objective-drafts')
  @HttpCode(201)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('graph:write')
  @ApiOperation({ summary: 'Start agreeing an objective. Not an objective until it is seeded.' })
  async startDraft(
    @Req() req: { machine: MachineCaller },
    @Body() dto: { initiatorExternalId?: string; workingTitle?: string; parentSubjectExternalId?: string },
  ) {
    if (!dto?.initiatorExternalId || !dto?.workingTitle) {
      throw new BadRequestException('initiatorExternalId and workingTitle are both required.');
    }
    return this.drafts.start(req.machine.organizationId, dto.initiatorExternalId, {
      workingTitle: dto.workingTitle,
      parentSubjectExternalId: dto.parentSubjectExternalId ?? null,
    });
  }

  /** Where it has got to, what is still contested, and what it is asking for next. */
  @Get('objective-drafts/:id')
  @UseGuards(MachineTokenGuard)
  /* `findings:read`, the same scope reading subjects takes. Not a new one: a
     draft is the org's own record of an objective being agreed, and it is
     already covered by the scope that reads what the system holds about the
     work. A draft carries people's positions, which is why it is not on a
     write-only credential. */
  @RequiresScope('findings:read')
  @ApiOperation({ summary: "A draft's state, its open disagreements, and the next question" })
  async draft(@Req() req: { machine: MachineCaller }, @Param('id') id: string) {
    return this.drafts.status(req.machine.organizationId, id);
  }

  /** Pull somebody in. Their own conversation, not a copy of anybody else's. */
  @Post('objective-drafts/:id/participants')
  @HttpCode(201)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('graph:write')
  @ApiOperation({ summary: 'Invite somebody onto a draft' })
  async inviteToDraft(
    @Req() req: { machine: MachineCaller },
    @Param('id') id: string,
    @Body() dto: { byExternalId?: string; personExternalId?: string },
  ) {
    if (!dto?.byExternalId || !dto?.personExternalId) {
      throw new BadRequestException('byExternalId and personExternalId are both required.');
    }
    return this.drafts.invite(req.machine.organizationId, id, dto.byExternalId, dto.personExternalId);
  }

  /**
   * Answer the next question the draft is asking.
   *
   * Separate from a contribution, which is how a second person DISAGREES and
   * opens a contention. An empty field is not a disagreement.
   */
  @Post('objective-drafts/:id/answers')
  @HttpCode(200)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('graph:write')
  @ApiOperation({ summary: 'Answer what the draft is asking for: measure, target, justification, approach' })
  async answerDraft(
    @Req() req: { machine: MachineCaller },
    @Param('id') id: string,
    @Body() dto: { personExternalId?: string; piece?: string; body?: string },
  ) {
    const PIECES = ['measure', 'target', 'justification', 'approach'];
    if (!dto?.personExternalId || !dto?.piece || !dto?.body) {
      throw new BadRequestException('personExternalId, piece and body are all required.');
    }
    if (!PIECES.includes(dto.piece)) {
      throw new BadRequestException(`piece must be one of ${PIECES.join(', ')}.`);
    }
    return this.drafts.answer(
      req.machine.organizationId,
      id,
      dto.personExternalId,
      dto.piece as 'measure' | 'target' | 'justification' | 'approach',
      dto.body,
    );
  }

  /** Say what you think it should be. Two different answers open a contention. */
  @Post('objective-drafts/:id/contributions')
  @HttpCode(200)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('graph:write')
  @ApiOperation({ summary: 'Say what you think the measure, target, title or date should be' })
  async contributeToDraft(
    @Req() req: { machine: MachineCaller },
    @Param('id') id: string,
    @Body() dto: { personExternalId?: string; field?: string; body?: string },
  ) {
    if (!dto?.personExternalId || !dto?.field || !dto?.body) {
      throw new BadRequestException('personExternalId, field and body are all required.');
    }
    return this.drafts.contribute(req.machine.organizationId, id, dto.personExternalId, dto.field, dto.body);
  }

  /** Settle a disagreement. A decision somebody makes, not a state that decays. */
  @Post('objective-drafts/:id/contentions/:contentionId/resolve')
  @HttpCode(200)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('graph:write')
  @ApiOperation({ summary: 'Settle one disagreement on a draft' })
  async resolveDraftContention(
    @Req() req: { machine: MachineCaller },
    @Param('id') id: string,
    @Param('contentionId') contentionId: string,
    @Body() dto: { resolution?: string },
  ) {
    if (!dto?.resolution) throw new BadRequestException('resolution is required - say what it is, not only that it is settled.');
    return this.drafts.resolveContention(req.machine.organizationId, id, contentionId, dto.resolution);
  }

  /**
   * Turn it into an objective. Refused while anybody still disagrees, and
   * refused while nobody has said why the number matters or how it moves.
   */
  @Post('objective-drafts/:id/seed')
  @HttpCode(201)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('graph:write')
  @ApiOperation({ summary: 'Make the agreed draft into an objective' })
  async seedDraft(
    @Req() req: { machine: MachineCaller },
    @Param('id') id: string,
    @Body() dto: { externalId?: string; sourceSystem?: string },
  ) {
    if (!dto?.externalId || !dto?.sourceSystem) {
      throw new BadRequestException('externalId and sourceSystem are both required - the objective needs an id in your own system.');
    }
    return this.drafts.seed(req.machine.organizationId, id, dto.externalId, dto.sourceSystem);
  }

  @Put('metrics')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('graph:write')
  @ApiOperation({ summary: 'Numbers from your own product, to sit beside what people say.' })
  async pushMetrics(
    @Req() req: { machine: MachineCaller },
    @Body() dto: { sourceSystem?: string; metrics?: any[] },
  ) {
    return this.groundsByApi.pushMetrics(req.machine.organizationId, dto?.sourceSystem, dto?.metrics ?? []);
  }

  @Put('interactions')
  @HttpCode(200)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('graph:write')
  @ApiOperation({ summary: 'What happened with a customer - visits, calls, meetings, proposals' })
  async pushInteractions(@Req() req: { machine: MachineCaller }, @Body() dto: any) {
    return this.whatHappened.push(req.machine.organizationId, dto?.sourceSystem, dto?.interactions ?? []);
  }

  @Put('evidence')
  @HttpCode(200)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('graph:write')
  @ApiOperation({ summary: 'Push current numbers against seeded objectives. Counts and short labels only.' })
  async pushEvidence(@Req() req: { machine: MachineCaller }, @Body() dto: { evidence: any[] }) {
    return this.groundsByApi.pushEvidence(req.machine.organizationId, dto?.evidence);
  }

  /**
   * ASK FOR A CHANGE TO AN AGREEMENT. NOTHING MOVES UNTIL SOMEBODY SAYS YES.
   */
  @Post('proposed-changes')
  @HttpCode(201)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('grounds:write')
  @ApiOperation({ summary: 'Propose a change to a seeded agreement. The current one stays in force.' })
  async proposeChange(@Req() req: { machine: MachineCaller }, @Body() dto: any) {
    return this.groundsByApi.proposeChange(req.machine.organizationId, dto);
  }

  /**
   * THE ANSWER, from whichever system made it.
   *
   * A machine token may carry this one, unlike accepting a suggested conversation - because here the
   * decision was made by a named person in the customer's own approval process, and this is them
   * telling us what it was. `decidedByExternalId` is required for exactly that reason: an approval
   * with nobody's name on it is not an approval.
   */
  @Post('proposed-changes/:id/resolve')
  @HttpCode(200)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('grounds:write')
  @ApiOperation({ summary: 'Record that a proposed change was approved or rejected.' })
  async resolveChange(@Req() req: { machine: MachineCaller }, @Param('id') id: string, @Body() dto: any) {
    return this.groundsByApi.resolveChange(req.machine.organizationId, id, dto);
  }

  /**
   * WHAT NEEDS SOMEBODY, IN FOUR BUCKETS.
   *
   * So nobody has to read every check-in. Each item says where it came from - somebody proposed it,
   * several people independently agreed it, Groundwork worked it out, or the customer's own evidence
   * shows it - because those four are not the same and acting on one thinking it was another is how
   * a feed loses its reader.
   */
  /**
   * WHAT TO READ BEFORE A CONVERSATION ABOUT SOMEBODY.
   *
   * `handovers:read`, not `findings:read`. scopes.ts already argues why those are separate - a
   * per-person read is "a good deal more than a finding" - and this is the most per-person thing
   * the API has. An integration granted findings must not get this by accident.
   */
  /**
   * `handovers:read`, the same scope as the per-person read this belongs beside. A question about
   * somebody's estimates is a question about what is on their desk, and it is governed the same way.
   */
  @Get('people/:personExternalId/forecasts')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('handovers:read')
  @ApiOperation({ summary: 'How the dates this person gave have turned out. Never a score.' })
  async howTheirForecastsHaveGone(
    @Req() req: { machine: MachineCaller },
    @Param('personExternalId') personExternalId: string,
  ) {
    return this.groundsByApi.howTheirForecastsHaveGone(req.machine.organizationId, personExternalId, req.machine);
  }

  @Get('people/:personExternalId/before-a-conversation')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('handovers:read')
  @ApiOperation({ summary: 'What the record holds about one person. Questions to ask, never an assessment.' })
  async beforeAConversation(
    @Req() req: { machine: MachineCaller },
    @Param('personExternalId') personExternalId: string,
  ) {
    return this.groundsByApi.beforeAConversation(req.machine.organizationId, personExternalId, req.machine);
  }

  @Get('findings/structured')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('findings:read')
  @ApiOperation({ summary: 'Findings with provenance, bucketed by what they need from a human.' })
  async structuredFindings(@Req() req: { machine: MachineCaller }) {
    return this.groundsByApi.structuredFindings(req.machine.organizationId, req.machine);
  }

  /**
   * SENSE-CHECK THE OBJECTIVES, INCLUDING THE ONES SET FROM ABOVE.
   *
   * Everything else here examines how work is going. This examines whether what is being asked for
   * holds together - the individual targets against the shared one, a commitment nobody is waiting
   * on, a standard nobody has shown the person it is about.
   */
  @Get('grounds/:groundId/sense-check')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('findings:read')
  @ApiOperation({ summary: 'Questions about the objectives themselves, before a quarter is spent on them.' })
  async senseCheck(@Req() req: { machine: MachineCaller }, @Param('groundId') groundId: string) {
    return this.groundsByApi.senseCheckGround(req.machine.organizationId, groundId, req.machine);
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
    const { row, created } = await this.scim.upsert(req.machine.organizationId, req.machine.sourceSystem, dto);
    return this.presentPerson(row, created);
  }

  @Patch('scim/v2/Users/:externalId')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('graph:write')
  @ApiOperation({ summary: 'Patch a person. The deprovisioning op every IdP sends is active:false.' })
  async scimPatch(@Req() req: { machine: MachineCaller }, @Param('externalId') externalId: string, @Body() body: any) {
    return this.presentPerson(await this.scim.patch(req.machine.organizationId, req.machine.sourceSystem, externalId, body));
  }

  /**
   * WHO EXISTS TWICE, and ABOVE `:externalId` on purpose — routes are matched in order, so
   * declared after it, "duplicates" would be read as somebody's id and answer "No such person."
   *
   * The duplicate roster a credential rotation used to create is invisible from every other read
   * here, because they are all organisation-wide and simply return both copies. This one goes
   * looking. It reports and does not merge: merging decides which record keeps somebody's
   * objectives and which account is theirs.
   */
  @Get('scim/v2/Users/duplicates')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('findings:read')
  @ApiOperation({ summary: 'People who exist under more than one source system, usually because a credential was replaced' })
  async scimDuplicates(@Req() req: { machine: MachineCaller }) {
    return this.scim.whoExistsTwice(req.machine.organizationId);
  }

  @Get('scim/v2/Users/:externalId')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('findings:read')
  @ApiOperation({ summary: 'Read one person as we hold them' })
  async scimGet(@Req() req: { machine: MachineCaller }, @Param('externalId') externalId: string) {
    const row = await this.scim.find(req.machine.organizationId, req.machine.sourceSystem, externalId);
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
