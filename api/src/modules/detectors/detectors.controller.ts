import { Controller, Get, Post, Req, UseGuards, HttpCode } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { MachineTokenGuard, RequiresScope, MachineCaller } from '../public-api/machine-token.guard';
import { PrismaService } from '../prisma/prisma.service';
import { DetectorsService } from './detectors.service';
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
    private readonly prisma: PrismaService,
  ) {}

  @Get('findings')
  @UseGuards(MachineTokenGuard)
  @RequiresScope('findings:read')
  @ApiOperation({ summary: 'Findings held for this organisation, evidence only' })
  async findings(@Req() req: { machine: MachineCaller }) {
    const rows = await this.prisma.detectorResult.findMany({
      where: { organizationId: req.machine.organizationId, resolvedAt: null },
      orderBy: [{ severity: 'desc' }, { lastSeenAt: 'desc' }],
      take: 200,
    });
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
  @RequiresScope('findings:read')
  @ApiOperation({ summary: 'Run the subject-scoped detectors now' })
  run(@Req() req: { machine: MachineCaller }) {
    return this.detectors.run(req.machine.organizationId);
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
