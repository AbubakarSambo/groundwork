import { Injectable, Optional } from '@nestjs/common';
import { whoAnAdminDidNotLetIn } from './who-an-admin-did-not-let-in';
import { PrismaService } from '../prisma/prisma.service';
import { GroundsService } from './grounds.service';
import { whatNeedsYou, type WhatNeedsYou } from './what-needs-you';
import { LeaveBoardService } from '../suites/the-leave-board.service';
import { whoIsAwayOn } from '../suites/who-is-away';
import { TimeSheetsService } from '../suites/the-time-sheets.service';
import { SpendingService } from '../suites/the-spending.service';
import { waitingForYouToApprove } from './waiting-for-you-to-approve';
import { peersAreNamedOn } from '../reports/peers-are-named';
import { whatEachLabelIsCalled, withoutInternalLabelsIn } from '../reports/no-internal-label-reaches-anyone';

/**
 * THE ONE READ OF "WHAT NEEDS YOU" (C1, U.5), for Today and for "Choose an organisation".
 *
 * Built only from what this reader is already given: `GroundsService.list()`, which applies the one
 * rule for who reads which check-in, and the approvals queue, which is asked for only when the reader
 * is an admin of that organisation. See what-needs-you.ts.
 */
@Injectable()
export class WhatNeedsYouService {
  constructor(
    private prisma: PrismaService,
    private grounds: GroundsService,
    @Optional() private leave?: LeaveBoardService,
    @Optional() private time?: TimeSheetsService,
    @Optional() private spend?: SpendingService,
  ) {}

  /**
   * WHAT IS WAITING FOR THIS READER TO APPROVE (week 21): leave, hours and spending, from each
   * board's own read, which says row by row whether this reader is the one who approves it. Only an
   * admin or a lead can open those boards, and a board that is switched off refuses, so a refusal
   * here is "nothing waiting", never an error on Today.
   */
  private async toApprove(userId: string, organizationId: string, role: string) {
    if (role !== 'ADMIN' && role !== 'LEAD') return [];
    const reader = { userId, organizationId };
    const [leave, time, spend] = await Promise.all([
      this.leave?.board(reader).then((b) => b.waiting).catch(() => []),
      this.time?.board(reader).then((b) => b.weeks.flatMap((w) => w.people.map((p) => ({ ...p, weekOf: w.weekOf })))).catch(() => []),
      this.spend?.board(reader).catch(() => null),
    ]);
    return waitingForYouToApprove({ leave: leave ?? [], hours: time ?? [], spend: spend?.waiting ?? [], currency: spend?.currency ?? null }, organizationId);
  }

  async forReader(userId: string, email: string, organizationId: string, role: string): Promise<WhatNeedsYou> {
    const [list, waiting, me, toApprove] = await Promise.all([
      this.grounds.list(organizationId, userId, email, role),
      role === 'ADMIN' ? this.grounds.listAwaitingApproval(organizationId, userId) : Promise.resolve([]),
      /**
       * NOT LET IN YET (U.8 third review, PRIVACY). One cheap read of the reader's own account,
       * so Today can stop offering a check-in to start or a report to read to somebody the
       * conversation layer would refuse at the door anyway (`awaitingOrgApproval`,
       * conversation.service.ts's `CANNOT_CHECK_IN_YET`) - and never something released, which is
       * exactly the word CLAUDE.md's privacy rule uses for who gets to read a shared report.
       */
      this.prisma.user.findUnique({ where: { id: userId }, select: { awaitingOrgApproval: true } }),
      this.toApprove(userId, organizationId, role),
    ]);
    /*
     * ONLY THIS ORGANISATION'S (U.5 review). The list also carries check-ins in other organisations
     * the reader takes part in, and Today used to lead with one of those, so "Today 3" disagreed with
     * "N new" on Choose an organisation. Another organisation's needs are counted there, not here.
     */
    const here = (list as any[]).filter((g) => g.organizationId === organizationId);
    /*
     * SOMEBODY AN ADMIN DID NOT LET IN IS NEITHER COUNTED NOR NAMED (screens request 95). The same
     * rule the board reads (request 85): of the people still waiting for approval, those whose latest
     * request to this organisation was declined.
     */
    const waitingIds = [...new Set(here.flatMap((g) => (g.participants ?? []).filter((p: any) => !!p.userId && p.user?.awaitingOrgApproval).map((p: any) => p.userId as string)))];
    const declined = await whoAnAdminDidNotLetIn(this.prisma, organizationId, waitingIds);
    if (declined.size) {
      for (const g of here) g.participants = (g.participants ?? []).map((p: any) => (p.userId && declined.has(p.userId) ? { ...p, notLetIn: true } : p));
    }
    /* On approved leave today (week 23): their own check-in says the round does not wait for them. Dates only. */
    const awayUntil = (await whoIsAwayOn(this.prisma, [userId], organizationId).catch(() => new Map<string, string>())).get(userId) ?? null;
    const told = whatNeedsYou(here as any, { userId, role, organizationId, notLetIn: !!me?.awaitingOrgApproval, awayUntil }, waiting.map((w) => ({ ...w, organizationId })), new Date(), toApprove);
    /* A net: no address stands in for a name in any sentence on Today (week 12c). */
    const called = new Map<string, string>();
    for (const g of here as any[]) {
      const runsIt = g.initiatorId === userId || role === 'ADMIN';
      const me = (g.participants ?? []).find((p: any) => p.userId === userId);
      for (const [k, v] of whatEachLabelIsCalled(g.participants ?? [], { viewerParticipantId: me?.id ?? null, viewerIsLead: runsIt, peersAreNamed: runsIt || peersAreNamedOn(g, { participantId: me?.id ?? null }) })) if (k[0] === '@' || k[0] === '~') called.set(k, v);
    }
    return called.size ? withoutInternalLabelsIn(told, called) : told;
  }

  /**
   * HOW MANY THINGS NEED YOU IN EACH ORGANISATION YOU BELONG TO: the "3 new" on each row of "Choose
   * an organisation". Each one is read with the role you have THERE, never the one you have here, and
   * only that organisation's own check-ins are counted, so nothing is counted twice.
   */
  async everywhere(userId: string, email: string): Promise<{ organizationId: string; count: number }[]> {
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { userId },
      select: { organizationId: true, role: true },
    });
    return Promise.all(
      memberships.map(async (m) => {
        const read = await this.forReader(userId, email, m.organizationId, String(m.role));
        return { organizationId: m.organizationId, count: read.needs.filter((n) => n.organizationId === m.organizationId).length };
      }),
    );
  }
}
