import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { GroundworkEvents } from '../../common/events';
import { lookForRecommendedCheckIns, theOffersWaiting, theLeadAnswers, THE_YES, THE_NO, type AnOfferTheLeadReads, type WhatToSetUp } from '../detectors/the-anchor-recommendations';

/**
 * WHAT GROUNDWORK RECOMMENDS (piece 24). Every lead reads it on every check-in she runs, with no setting in the way (Hafsah, 3 November
 * evening). It rests on the check-in's own record; warnings, plans and firing stay the lead's decision. The lead reads and answers every
 * offer; a team member only their own. See detectors/the-anchor-recommendations.ts for what is offered and what is never done.
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
      await lookForRecommendedCheckIns(this.prisma as any, e.groundId);
    } catch (err: any) {
      this.logger.warn(`Recommended check-ins could not be looked for: ${err?.message ?? err}`);
    }
  }

  private async theLeadsGround(groundId: string, userId: string) {
    const g = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { organizationId: true, initiatorId: true } });
    if (!g) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    if (g.initiatorId !== userId) throw new ForbiddenException('Only the person who set this check-in up can read what Groundwork recommends.');
    return g;
  }

  async forTheLead(groundId: string, userId: string): Promise<{ offers: AnOfferTheLeadReads[] }> {
    const g = await this.theLeadsGround(groundId, userId);
    return { offers: await theOffersWaiting(this.prisma as any, groundId, g.organizationId) };
  }

  /**
   * WHAT GROUNDWORK RECOMMENDS, AS EACH READER READS IT (Hafsah's answer 5, 16 October 2026: "Groundwork recommends" for a
   * team member covers only their own work; brought to staging by the browser test of 20 October, where every team member's
   * board asked for this and was refused). The lead reads every offer on her check-in, as before. A team member reads only an
   * offer made for them in particular (`personExternalId` is their own row) and resting on nobody's words but their own: never
   * an offer drawn from what colleagues said, and never the lead's judgement. Anybody else is told it cannot be found.
   */
  async forTheReader(groundId: string, userId: string): Promise<{ offers: AnOfferTheLeadReads[] }> {
    const g = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { organizationId: true, initiatorId: true, participants: { select: { id: true, userId: true } } } as any }) as any;
    if (!g) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    if (g.initiatorId === userId) return this.forTheLead(groundId, userId);
    const me = (g.participants ?? []).find((p: any) => p.userId === userId);
    if (!me) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
    return { offers: await this.theirOwnOffers(groundId, g.organizationId, me.id) };
  }

  private async theirOwnRows(groundId: string, organizationId: string, participantId: string, offerId?: string): Promise<any[]> {
    const rows: any[] = await (this.prisma.recommendation.findMany({
      where: { organizationId, subjectExternalId: `check-in:${groundId}`, personExternalId: participantId, state: 'PROPOSED', ...(offerId ? { id: offerId } : {}) } as any,
      orderBy: { proposedAt: 'asc' },
    }) as Promise<any[]>).catch(() => []);
    return rows.filter((r) => onlyTheirOwnWork(r, participantId));
  }

  private async theirOwnOffers(groundId: string, organizationId: string, participantId: string): Promise<AnOfferTheLeadReads[]> {
    const rows = await this.theirOwnRows(groundId, organizationId, participantId);
    return rows.map((r) => ({ id: r.id, kind: r.kind, says: r.body, question: r.rationale?.question ?? '', yes: THE_YES, no: THE_NO })) as any;
  }

  async answer(groundId: string, offerId: string, userId: string, yes: boolean): Promise<{ state: 'ACCEPTED' | 'DECLINED'; setUp?: WhatToSetUp }> {
    /* A team member answers only an offer about their own work (answer 5); everything else is the lead's, as before. */
    const g = await this.prisma.ground.findUnique({ where: { id: groundId }, select: { organizationId: true, initiatorId: true, participants: { select: { id: true, userId: true } } } as any }).catch(() => null) as any;
    const me = g && g.initiatorId !== userId ? (g.participants ?? []).find((p: any) => p.userId === userId) : null;
    if (me) {
      const [row] = await this.theirOwnRows(groundId, g.organizationId, me.id, offerId);
      if (!row) throw new NotFoundException('Nothing is waiting for your answer under that id.');
      const state: 'ACCEPTED' | 'DECLINED' = yes ? 'ACCEPTED' : 'DECLINED';
      const { count } = await this.prisma.recommendation.updateMany({ where: { id: row.id, state: 'PROPOSED' }, data: { state, resolvedAt: new Date(), resolvedByExternalId: userId } as any });
      if (!count) throw new NotFoundException('Nothing is waiting for your answer under that id.');
      return { state, ...(yes ? { setUp: { kind: row.kind, about: row.body, aim: row.rationale?.aim ?? null, people: [] } as any } : {}) };
    }
    await this.theLeadsGround(groundId, userId);
    const out = await theLeadAnswers(this.prisma as any, { groundId, offerId, leadUserId: userId, yes });
    if (!out.ok) throw new NotFoundException('Nothing is waiting for your answer under that id.');
    return { state: out.state, ...(out.setUp ? { setUp: out.setUp } : {}) };
  }
}

/** Whether an offer rests on this person's own work alone: whoever it names as behind it is them, or nobody. */
export function onlyTheirOwnWork(row: { rationale?: any }, participantId: string): boolean {
  const ids: unknown = row?.rationale?.peopleIds;
  if (!Array.isArray(ids) || ids.length === 0) return true;
  return ids.every((x) => x === participantId);
}
