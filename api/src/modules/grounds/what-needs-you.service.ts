import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroundsService } from './grounds.service';
import { whatNeedsYou, type WhatNeedsYou } from './what-needs-you';

/**
 * THE ONE READ OF "WHAT NEEDS YOU" (C1, U.5), for Today and for "Choose an organisation".
 *
 * Built only from what this reader is already given: `GroundsService.list()`, which applies the one
 * rule for who reads which check-in, and the approvals queue, which is asked for only when the reader
 * is an admin of that organisation. See what-needs-you.ts.
 */
@Injectable()
export class WhatNeedsYouService {
  constructor(private prisma: PrismaService, private grounds: GroundsService) {}

  async forReader(userId: string, email: string, organizationId: string, role: string): Promise<WhatNeedsYou> {
    const [list, waiting, me] = await Promise.all([
      this.grounds.list(organizationId, userId, email, role),
      role === 'ADMIN' ? this.grounds.listAwaitingApproval(organizationId) : Promise.resolve([]),
      /**
       * NOT LET IN YET (U.8 third review, PRIVACY). One cheap read of the reader's own account,
       * so Today can stop offering a check-in to start or a report to read to somebody the
       * conversation layer would refuse at the door anyway (`awaitingOrgApproval`,
       * conversation.service.ts's `CANNOT_CHECK_IN_YET`) - and never something released, which is
       * exactly the word CLAUDE.md's privacy rule uses for who gets to read a shared report.
       */
      this.prisma.user.findUnique({ where: { id: userId }, select: { awaitingOrgApproval: true } }),
    ]);
    /*
     * ONLY THIS ORGANISATION'S (U.5 review). The list also carries check-ins in other organisations
     * the reader takes part in, and Today used to lead with one of those, so "Today 3" disagreed with
     * "N new" on Choose an organisation. Another organisation's needs are counted there, not here.
     */
    const here = (list as any[]).filter((g) => g.organizationId === organizationId);
    return whatNeedsYou(here as any, { userId, role, organizationId, notLetIn: !!me?.awaitingOrgApproval }, waiting.map((w) => ({ ...w, organizationId })));
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
