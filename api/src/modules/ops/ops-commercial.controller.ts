import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OpsCapabilityGuard, NeedsOps } from './ops-capability.guard';
import { OpsCommercialService } from './ops-commercial.service';
import { OpsContributionService } from './ops-contribution.service';
import { OpsIdentity } from './ops-people.service';
import { PrismaService } from '../prisma/prisma.service';
import { can } from './what-somebody-may-do';
import {
  OpsCommercialStage,
  OpsPositioningStage,
  OpsContributionRole,
  OpsAttributionState,
} from '@prisma/client';

interface OpsRequest {
  opsIdentity: OpsIdentity;
}

@ApiTags('Operating system')
@ApiBearerAuth()
@Controller('ops/commercial')
@UseGuards(JwtAuthGuard, OpsCapabilityGuard)
export class OpsCommercialController {
  constructor(
    private readonly commercial: OpsCommercialService,
    private readonly contribution: OpsContributionService,
    private readonly prisma: PrismaService,
  ) {}

  /** Dates come in as a window or not at all; not at all means all time. */
  private window(from?: string, to?: string) {
    return from && to ? { from: new Date(from), to: new Date(to) } : { from: undefined, to: undefined };
  }

  // --- The three views, kept apart ----------------------------------------

  /** A. What the company did. Nobody's personal contribution. */
  @Get('performance')
  @NeedsOps('sales:read')
  @ApiOperation({ summary: "Groundwork's commercial performance" })
  performance(@Query('from') from?: string, @Query('to') to?: string) {
    const w = this.window(from, to);
    return this.contribution.companyPerformance(w.from, w.to);
  }

  /** B. The health of the function Sahar owns. Not her contribution. */
  @Get('function-health')
  @NeedsOps('sales:read')
  @ApiOperation({ summary: 'The health of the sales and market acquisition function' })
  functionHealth() {
    return this.contribution.functionHealth();
  }

  /**
   * C. One person's ledger.
   *
   * Their own always. Everybody's needs the capability - a contribution record
   * is personal, and reading the whole team's is a management act rather than a
   * default.
   */
  @Get('ledger/:personKey')
  @ApiOperation({ summary: "What one person personally created" })
  async ledger(
    @Req() req: OpsRequest,
    @Param('personKey') personKey: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (personKey !== req.opsIdentity.key && !can(req.opsIdentity.capabilities, 'commercial:read-all')) {
      throw new ForbiddenException(
        `${personKey}'s contribution record is theirs. This needs commercial:read-all.`,
      );
    }
    const person = await this.prisma.opsPerson.findUnique({ where: { key: personKey } });
    if (!person) throw new ForbiddenException(`No one here called ${personKey}`);

    const w = this.window(from, to);
    return {
      person: { key: person.key, displayName: person.displayName, functionalRole: person.functionalRole },
      /*
       * Said on every ledger. A technical contributor with nothing here is not
       * underperforming - commercial acquisition is not their job, and a page of
       * zeroes with no explanation reads as a verdict.
       */
      note:
        person.functionalRole === 'SALES_MARKETING'
          ? 'Commercial acquisition is part of this role.'
          : 'Commercial acquisition is not part of this role. Anything here is contribution beyond what they are responsible for.',
      ...(await this.contribution.ledgerFor(person.id, w.from, w.to)),
    };
  }

  /** Share of new revenue, by person. A share, not a rank. */
  @Get('share-of-new-revenue')
  @NeedsOps('commercial:read-all')
  @ApiOperation({ summary: 'Of new revenue in the window, what share each person originated' })
  shareOfNewRevenue(@Query('from') from?: string, @Query('to') to?: string) {
    const w = this.window(from, to);
    return this.contribution.shareOfNewRevenue(w.from, w.to);
  }

  // --- The pipeline --------------------------------------------------------

  @Get('pipeline')
  @NeedsOps('sales:read')
  @ApiOperation({ summary: 'Commercial opportunities' })
  pipeline(@Query('stage') stage?: OpsCommercialStage) {
    return this.commercial.pipeline({ stage });
  }

  @Post('pipeline')
  @NeedsOps('sales:write')
  @ApiOperation({ summary: 'Open an opportunity. Records nobody as having created it.' })
  open(
    @Body() body: { companyKey: string; name: string; opportunityType?: string; campaignId?: string; estimatedMrr?: number; estimatedContractValue?: number },
  ) {
    return this.commercial.open(body);
  }

  @Patch('pipeline/:id/stage')
  @NeedsOps('sales:write')
  @ApiOperation({ summary: 'Move it along' })
  advance(@Param('id') id: string, @Body() body: { stage: OpsCommercialStage; lostReason?: string }) {
    return this.commercial.advance(id, body.stage, body.lostReason);
  }

  @Patch('pipeline/:id/next-action')
  @NeedsOps('sales:write')
  @ApiOperation({ summary: 'Say what happens next. Creates no attribution.' })
  nextAction(@Param('id') id: string, @Body() body: { nextAction: string; ownerId?: string; dueAt?: string }) {
    return this.commercial.setNextAction(id, body.nextAction, body.ownerId, body.dueAt ? new Date(body.dueAt) : undefined);
  }

  @Post('pipeline/:id/payments')
  @NeedsOps('sales:write')
  @ApiOperation({ summary: 'Record money that actually arrived' })
  payment(
    @Req() req: OpsRequest,
    @Param('id') id: string,
    @Body() body: { amount: number; paidAt: string; reference?: string },
  ) {
    return this.commercial.recordPayment({
      opportunityId: id,
      amount: body.amount,
      paidAt: new Date(body.paidAt),
      reference: body.reference,
      recordedById: req.opsIdentity.personId,
    });
  }

  // --- Attribution ---------------------------------------------------------

  /** Anybody may claim what they created. Nobody may approve their own. */
  @Post('pipeline/:id/claims')
  @ApiOperation({ summary: 'Say that you created this' })
  claim(
    @Req() req: OpsRequest,
    @Param('id') id: string,
    @Body() body: { role: OpsContributionRole; claimedBasis: string; evidenceUrl?: string },
  ) {
    return this.commercial.claim({ ...body, opportunityId: id, claimantId: req.opsIdentity.personId });
  }

  @Get('claims')
  @NeedsOps('commercial:approve')
  @ApiOperation({ summary: 'Commercial attribution awaiting review' })
  claims() {
    return this.commercial.claimsAwaiting();
  }

  @Patch('claims/:id')
  @NeedsOps('commercial:approve')
  @ApiOperation({ summary: 'Approve, approve as somebody else, or reject' })
  decide(
    @Req() req: OpsRequest,
    @Param('id') id: string,
    @Body() body: { state: Exclude<OpsAttributionState, 'NEEDS_REVIEW' | 'CLAIMED'>; note?: string; insteadPersonId?: string },
  ) {
    return this.commercial.decideClaim(id, body, req.opsIdentity);
  }

  /** Every claim ever made about one opportunity, decided or not. */
  @Get('pipeline/:id/attribution-history')
  @NeedsOps('sales:read')
  @ApiOperation({ summary: 'How attribution on this opportunity was arrived at' })
  history(@Param('id') id: string) {
    return this.commercial.attributionHistory(id);
  }

  // --- Positioning ---------------------------------------------------------

  @Get('positioning')
  @NeedsOps('sales:read')
  @ApiOperation({ summary: 'Market access somebody opened up' })
  positioning(@Query('contributor') contributorId?: string) {
    return this.commercial.positioning(contributorId);
  }

  @Post('positioning')
  @ApiOperation({ summary: 'Record access you opened up' })
  openPositioning(
    @Req() req: OpsRequest,
    @Body() body: { personOrNetwork: string; organization?: string; accessType: string; evidenceUrl?: string },
  ) {
    return this.commercial.openPositioning({ ...body, contributorId: req.opsIdentity.personId });
  }

  @Patch('positioning/:id/stage')
  @NeedsOps('sales:write')
  @ApiOperation({ summary: 'Move it along the access funnel' })
  advancePositioning(@Param('id') id: string, @Body() body: { stage: OpsPositioningStage }) {
    return this.commercial.advancePositioning(id, body.stage);
  }
}
