import { thePersonJudgementsAreOn } from '../organisation/person-judgements';
import { Controller, Get, Post, Param, Body, Req, UseGuards, HttpCode, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { MachineTokenGuard, RequiresScope, MachineCaller } from '../public-api/machine-token.guard';
import { mayTouch } from '../public-api/a-fence-around-a-credential';
import { PrismaService } from '../prisma/prisma.service';
import { DetectorsService } from './detectors.service';
import { RolesService, RoleInput, ActionInput } from './roles-and-their-action.service';
import { ScenariosService } from './scenarios.service';
import { ANCHOR_KINDS } from './the-anchor-recommendations';
import { IMPLEMENTED, GENUINELY_NEW } from './one-vocabulary-two-scopes';

/**
 * FINDINGS, AND WHAT THE SERIALISER REFUSES TO CARRY.
 *
 * §12.8 binds hardest here of anywhere in the API: this is the endpoint whose whole purpose is to
 * describe behaviour. What leaves is the EVIDENCE - what was seen, about which work - and never a
 * judgement about a person, never attributed testimony, and never a score. The judgement stays with
 * the human who has to make it.
 */
@ApiTags('Integration API')
@Public()
@Controller('api/org/v1')
export class DetectorsController {
  constructor(
    private readonly detectors: DetectorsService,
    private readonly scenarios: ScenariosService,
    private readonly prisma: PrismaService,
    private readonly roles: RolesService,
  ) {}

  /**
   * A ROLE AND ITS ONE CONVERTING ACTION. §6.3.
   *
   * `graph:write` rather than a scope of its own: this is the same kind of fact as a person or a
   * subject - what the customer's organisation is made of - and a new scope would mean every
   * existing integration silently unable to send it until somebody reissued their credential.
   */
  @Post('roles')
  @HttpCode(200)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('graph:write')
  @ApiOperation({ summary: 'Configure a role and the one action it turns on' })
  putRole(@Req() req: { machine: MachineCaller }, @Body() dto: RoleInput) {
    return this.roles.put(req.machine.organizationId, dto);
  }

  @Get('roles')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('graph:read')
  @ApiOperation({ summary: 'The roles configured for this organisation' })
  listRoles(@Req() req: { machine: MachineCaller }) {
    return this.roles.list(req.machine.organizationId);
  }

  /**
   * THE ACTION HAPPENED. One occurrence, at a time, with somewhere to see it.
   *
   * This is what `neglected_primary` reads. Without it the detector has a role, a clock, and no way
   * of knowing whether anything took place - so it would either never fire or fire at everybody.
   */
  @Post('primary-actions')
  @HttpCode(200)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('graph:write')
  @ApiOperation({ summary: "Record that a role's primary action happened" })
  recordAction(@Req() req: { machine: MachineCaller }, @Body() dto: ActionInput) {
    return this.roles.record(req.machine.organizationId, dto);
  }

  @Get('findings')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('findings:read')
  @ApiOperation({ summary: 'Findings held for this organisation, evidence only' })
  async findings(@Req() req: { machine: MachineCaller }) {
    const all = await this.prisma.detectorResult.findMany({
      /* A pattern mirrored from a check-in is a finding about a named person, mirrored after one
         session under its code, before the person has read it. It never reaches the developer API,
         with patterns served or not: people read patterns only through patterns/who-reads-a-pattern. */
      where: { organizationId: req.machine.organizationId, resolvedAt: null, sourcePatternDetectionId: null },
      orderBy: [{ severity: 'desc' }, { lastSeenAt: 'desc' }],
      take: 200,
    });
    /* The same fence `structuredFindings` applies over this same table: a credential bound to some
       people does not see findings about the others. A finding about no person in particular passes. */
    /* Judgements of a person off for this organisation: no finding about a person is served (organisation/person-judgements.ts). */
    const judged = await thePersonJudgementsAreOn(this.prisma, req.machine.organizationId);
    const rows = all.filter((r) => !r.personExternalId || (judged && mayTouch(req.machine, r.personExternalId)));
    return {
      /* Named so a customer can tell "none found" from "not built yet" - the same reasoning as
         only offering webhook events that can fire. */
      implemented: IMPLEMENTED,
      notYetImplemented: GENUINELY_NEW.filter((k) => !(IMPLEMENTED as string[]).includes(k)),
      findings: rows.map((r) => this.present(r)),
    };
  }

  @Post('findings/run')
  @HttpCode(200)
  @UseGuards(MachineTokenGuard)
  /* It writes Recommendation rows, so it is the write scope the accept and decline routes already
     carry. A read-only credential was writing proposals with it (fix plan A11). For one release a
     credential holding only findings:read is still let through, and logged - see scopes.ts IMPLIED. */
  @RequiresScope('proposals:write')
  @ApiOperation({ summary: 'Run the detectors now, and propose any conversation they imply' })
  async run(@Req() req: { machine: MachineCaller }) {
    const found = await this.detectors.run(req.machine.organizationId);
    /*
     * PROPOSAL RUNS WHERE DETECTION DOES, because scenarios read detector output and there is no
     * cron behind either - the customer triggers this. Leaving proposal on its own endpoint would
     * mean the suggestions were always one cycle behind the findings they were built from, and an
     * integration that called only this one would never see a suggestion at all.
     */
    const suggested = await this.scenarios.propose(req.machine.organizationId);
    return { ...found, scenarios: suggested };
  }

  @Get('recommendations')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('proposals:read')
  @ApiOperation({ summary: 'Work an objective needs that nobody has picked up. Proposed, never created.' })
  async recommendations(@Req() req: { machine: MachineCaller }) {
    const rows = await this.prisma.recommendation.findMany({
      /* The recommended check-ins on an anchor check-in are the lead's alone and are not part of this list. */
      where: { organizationId: req.machine.organizationId, state: 'PROPOSED', kind: { notIn: [...ANCHOR_KINDS] } },
      orderBy: { proposedAt: 'desc' },
      take: 100,
    });
    return {
      recommendations: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        subjectExternalId: r.subjectExternalId,
        personExternalId: r.personExternalId,
        body: r.body,
        /* The gap it closes, so a proposal can be interrogated rather than taken on faith. */
        rationale: r.rationale,
        proposedAt: r.proposedAt,
      })),
    };
  }

  @Post('recommendations/:id/accept')
  @HttpCode(200)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('proposals:write')
  @ApiOperation({ summary: 'Accept a recommendation. Records who and when.' })
  accept(@Req() req: { machine: MachineCaller }, @Param('id') id: string, @Body() dto: { byExternalId?: string }) {
    return this.resolve(req.machine.organizationId, id, 'ACCEPTED', dto?.byExternalId);
  }

  @Post('recommendations/:id/decline')
  @HttpCode(200)
  @UseGuards(MachineTokenGuard)
  @RequiresScope('proposals:write')
  @ApiOperation({ summary: 'Decline a recommendation. It is not proposed again.' })
  decline(@Req() req: { machine: MachineCaller }, @Param('id') id: string, @Body() dto: { byExternalId?: string }) {
    return this.resolve(req.machine.organizationId, id, 'DECLINED', dto?.byExternalId);
  }

  /**
   * A DECISION HAS SOMEBODY'S NAME AGAINST IT.
   *
   * Not for blame - for the opposite. Six months later the question is who decided this objective
   * did not need an owner, and "the system did" is the answer that makes people distrust every
   * other suggestion it has made since.
   */
  private async resolve(organizationId: string, id: string, state: 'ACCEPTED' | 'DECLINED', by?: string) {
    const { count } = await this.prisma.recommendation.updateMany({
      where: { id, organizationId, state: 'PROPOSED', kind: { notIn: [...ANCHOR_KINDS] } },
      data: { state, resolvedAt: new Date(), resolvedByExternalId: by ?? null },
    });
    if (!count) throw new BadRequestException('No recommendation waiting under that id.');
    return { id, state };
  }

  /**
   * AN ALLOW-LIST, and the fields NOT here are the point.
   *
   * No internal id, no ground id, no observation text lifted from somebody's check-in - that last
   * one is attributed testimony wearing a different name, and it is exactly what §12.8 excludes.
   */
  private present(r: any) {
    return {
      type: r.key,
      severity: r.severity,
      subjectExternalId: r.subjectExternalId,
      participantExternalId: r.personExternalId,
      /* The one sentence written for a person to read, and nothing else from the evidence blob. */
      summary: typeof r.evidence?.says === 'string' ? r.evidence.says : null,
      firstSeenAt: r.firstSeenAt,
      lastSeenAt: r.lastSeenAt,
    };
  }
}
