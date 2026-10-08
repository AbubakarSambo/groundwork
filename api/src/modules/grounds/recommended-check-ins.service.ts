import { aGroundIsTheAnchors } from '../conversation/the-anchor-weekly-check-in';
import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { GroundworkEvents } from '../../common/events';
import { theAnchorScenarioIsOn } from '../admin/what-is-hidden-at-release';
import { lookForRecommendedCheckIns, theOffersWaiting, theLeadAnswers, type AnOfferTheLeadReads, type WhatToSetUp } from '../detectors/the-anchor-recommendations';

/**
 * RECOMMENDED CHECK-INS FOR A CHECK-IN STARTED FROM THE ANCHOR (piece 24). Behind the anchor switch:
 * with it off nothing is looked for and nothing is served. The lead alone reads and answers them.
 * See detectors/the-anchor-recommendations.ts for what is offered and what is never done.
 */
@Injectable()
export class RecommendedCheckInsService {
  private readonly logger = new Logger(RecommendedCheckInsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Looked for only when something new comes in: a person completing their check-in. */
  @OnEvent(GroundworkEvents.CHECK_IN_COMPLETED)
  async onCheckInCompleted(e: { groundId?: string }) {
    if (!e?.groundId) return;
    try {
      if (!(await theAnchorScenarioIsOn(this.prisma))) return;
      await lookForRecommendedCheckIns(this.prisma as any, e.groundId);
    } catch (err: any) {
      this.logger.warn(`Recommended check-ins could not be looked for: ${err?.message ?? err}`);
    }
  }

  private async theLeadsGround(groundId: string, userId: string) {
    const g = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { organizationId: true, initiatorId: true, startedFrom: true, scenario: true } });
    if (!g) throw new NotFoundException('Check-in not found');
    if (g.initiatorId !== userId) throw new ForbiddenException('Only the person who set this check-in up can read what Groundwork recommends.');
    return g;
  }

  async forTheLead(groundId: string, userId: string): Promise<{ offers: AnOfferTheLeadReads[] }> {
    const g = await this.theLeadsGround(groundId, userId);
    if (!aGroundIsTheAnchors(g as any) || !(await theAnchorScenarioIsOn(this.prisma))) return { offers: [] };
    return { offers: await theOffersWaiting(this.prisma as any, groundId, g.organizationId) };
  }

  async answer(groundId: string, offerId: string, userId: string, yes: boolean): Promise<{ state: 'ACCEPTED' | 'DECLINED'; setUp?: WhatToSetUp }> {
    await this.theLeadsGround(groundId, userId);
    const out = await theLeadAnswers(this.prisma as any, { groundId, offerId, leadUserId: userId, yes });
    if (!out.ok) throw new NotFoundException('Nothing is waiting for your answer under that id.');
    return { state: out.state, ...(out.setUp ? { setUp: out.setUp } : {}) };
  }
}
