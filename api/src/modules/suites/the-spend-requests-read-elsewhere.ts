/**
 * THE ONLY READS OF A REQUEST TO SPEND THAT ANYTHING OUTSIDE THE SUITES MAKES (22 November 2026). Spending is read in the suites alone, so no request to spend
 * or budget reaches a check-in or a report (the-spending-as-each-reader-reads-it.spec.ts). Two places outside needed one: Ask, to put a file someone just added
 * on their own newest waiting request; and a senior person's payments, to hold her tracker's lines against the requests on record. Both read here.
 */

/** The asker's own newest request to spend that is still waiting and has nothing attached, made since `since` where given. Nobody else's. */
export async function theirNewestWaitingRequest(prisma: any, a: { organizationId: string; userId: string; since?: Date }): Promise<{ id: string; amount: unknown; what: string | null } | null> {
  return (await Promise.resolve(prisma.spendRequest?.findFirst?.({
    where: { organizationId: a.organizationId, userId: a.userId, status: 'waiting', attachedName: null, ...(a.since ? { createdAt: { gte: a.since } } : {}) },
    orderBy: { createdAt: 'desc' },
    select: { id: true, amount: true, what: true },
  })).catch(() => null)) ?? null;
}

/** The organisation's requests to spend, for a senior person's payments to be held against (principal-work/the-payments-work.ts). */
export async function theOrganisationsSpendRequests(prisma: any, organizationId: string): Promise<any[]> {
  return (await Promise.resolve(prisma.spendRequest?.findMany?.({ where: { organizationId } })).catch(() => [])) ?? [];
}
