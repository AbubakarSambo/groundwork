/**
 * WHO THE ORGANISATION DID NOT LET IN (screens requests 85 and 95).
 *
 * Somebody an admin declined at the door cannot be asked to check in. Of the people still waiting
 * for an organisation's approval, this finds the ones whose latest request to that organisation was
 * declined, the way the People page and the check-in's own roster read it. The board (request 85) and
 * Today (request 95) both ask this one function, so they can never disagree about who is meant.
 */
export async function whoAnAdminDidNotLetIn(
  prisma: any,
  organizationId: string,
  waitingUserIds: string[],
): Promise<Map<string, { decidedByUserId: string | null; decidedAt: Date | null }>> {
  const declined = new Map<string, { decidedByUserId: string | null; decidedAt: Date | null }>();
  if (!organizationId || !waitingUserIds.length) return declined;
  const requests: any[] = (await prisma.membershipRequest?.findMany?.({
    where: { organizationId, userId: { in: waitingUserIds } },
    orderBy: { createdAt: 'desc' },
    select: { userId: true, status: true, decidedByUserId: true, decidedAt: true },
  })) ?? [];
  const seen = new Set<string>();
  for (const r of requests) {
    if (seen.has(r.userId)) continue;
    seen.add(r.userId);
    if (r.status === 'DECLINED') declined.set(r.userId, { decidedByUserId: r.decidedByUserId ?? null, decidedAt: r.decidedAt ?? null });
  }
  return declined;
}
