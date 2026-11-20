/**
 * THE NUMBER EVERY SENDER USES, NOT ONLY THE ONE ON THE SIGN-IN (Drop Access, 21 October). A number a lead added on a
 * check-in's people list, or the HR system sent, is kept on the organisation's roster, and the openings go to it. The
 * roster's number first, then the sign-in's, as the senders read it.
 *
 * One reader for it, so the People list and the Desk's directory (S7) always show the same number for a person.
 */
export async function theNumberEachPersonIsReachedOn(
  prisma: any,
  organizationId: string,
  users: { id: string; email: string | null; phoneNumber: string | null }[],
): Promise<Map<string, string | null>> {
  const onTheRoster = new Map<string, string>();
  if (users.length) {
    const ids = users.map((u) => u.id);
    const entries: any[] = await Promise.resolve(prisma.person?.findMany?.({
      where: { organizationId, phone: { not: null }, OR: [{ linkedUserId: { in: ids } }, { email: { in: users.map((u) => u.email).filter(Boolean), mode: 'insensitive' } }] },
      orderBy: { updatedAt: 'desc' },
      select: { phone: true, linkedUserId: true, email: true },
    })).catch(() => []);
    const idOf = new Map(users.filter((u) => u.email).map((u) => [String(u.email).toLowerCase(), u.id]));
    for (const e of entries ?? []) {
      const who = (e.linkedUserId && ids.includes(e.linkedUserId) ? e.linkedUserId : null) ?? idOf.get(String(e.email ?? '').toLowerCase());
      if (who && e.phone && !onTheRoster.has(who)) onTheRoster.set(who, e.phone);
    }
  }
  return new Map(users.map((u) => [u.id, onTheRoster.get(u.id) ?? u.phoneNumber ?? null]));
}
