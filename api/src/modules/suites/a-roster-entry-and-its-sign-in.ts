import type { PrismaService } from '../prisma/prisma.service';

/**
 * A ROSTER ENTRY AND ITS SIGN-IN ARE THE SAME PERSON WHEN THEY CARRY THE SAME EMAIL (decision 82,
 * item 6; WhatsApp item 8).
 *
 * Leave, hours and spending, and who approves them, used to read only `Person.linkedUserId`. A
 * person on the roster whose entry was never linked, but whose address is the address they sign in
 * with, was nobody to the requests: Ask Groundwork skipped their leave, hours and spending, and a
 * manager like that was never found as the one who approves. Now every place that goes from a roster
 * entry to a sign-in, or back, asks here.
 *
 * The rule: the link when there is one. Otherwise the one account with the same address, compared
 * trimmed and without regard to capitals, and only an account that belongs to this organisation. An
 * entry already linked to somebody else is never matched by address, and an account already linked
 * to another entry is never matched to a second one. Nothing here writes: matching is read each time.
 */

const tidy = (email: string | null | undefined) => (email ?? '').trim().toLowerCase();

type ARow = { linkedUserId: string | null; email?: string | null };

/** The accounts in this organisation with any of these addresses, by tidied address. */
async function accountsByAddress(prisma: PrismaService, organizationId: string, addresses: string[]): Promise<Map<string, string>> {
  const wanted = [...new Set(addresses.map(tidy).filter(Boolean))];
  const out = new Map<string, string>();
  if (!wanted.length || !(prisma as any).user?.findMany) return out;
  const users: { id: string; email: string }[] = await (prisma as any).user
    .findMany({
      where: {
        deletedAt: null,
        OR: wanted.map((e) => ({ email: { equals: e, mode: 'insensitive' as const } })),
        AND: [{ OR: [{ organizationId }, { memberships: { some: { organizationId } } }] }],
      },
      select: { id: true, email: true },
    })
    .catch(() => []);
  for (const u of users ?? []) out.set(tidy(u.email), u.id);
  return out;
}

/**
 * Each row with `userId`: its sign-in, linked or matched by address. Rows with neither keep null.
 * An account already linked to one of these rows is not matched to another.
 */
export async function withTheirSignIns<T extends ARow>(prisma: PrismaService, organizationId: string, rows: T[]): Promise<(T & { userId: string | null })[]> {
  const unlinked = rows.filter((r) => !r.linkedUserId && tidy(r.email));
  const found = unlinked.length ? await accountsByAddress(prisma, organizationId, unlinked.map((r) => r.email ?? '')) : new Map<string, string>();
  const taken = new Set(rows.map((r) => r.linkedUserId).filter((x): x is string => !!x));
  /* An account already linked to another entry in this organisation is that entry's, not this one's. */
  if (found.size && (prisma as any).person?.findMany) {
    const elsewhere: { linkedUserId: string | null }[] = await (prisma as any).person
      .findMany({ where: { organizationId, linkedUserId: { in: [...found.values()] } }, select: { linkedUserId: true } })
      .catch(() => []);
    for (const p of elsewhere ?? []) if (p.linkedUserId) taken.add(p.linkedUserId);
  }
  return rows.map((r) => {
    if (r.linkedUserId) return { ...r, userId: r.linkedUserId };
    const matched = found.get(tidy(r.email));
    return { ...r, userId: matched && !taken.has(matched) ? matched : null };
  });
}

/** One roster entry's sign-in: the link, or the account with the same address. */
export async function theirSignIn(prisma: PrismaService, organizationId: string, row: ARow | null | undefined): Promise<string | null> {
  if (!row) return null;
  return (await withTheirSignIns(prisma, organizationId, [row]))[0].userId;
}

/**
 * The roster entries of these sign-ins, by user id: the linked entry, or else the one unlinked
 * active entry with the same address. `select` is what the caller reads; `email` and `linkedUserId`
 * are read as well, to match.
 */
export async function theirRosterEntries<S extends Record<string, true>>(
  prisma: PrismaService,
  organizationId: string,
  userIds: string[],
  select: S,
  extraWhere: Record<string, unknown> = {},
): Promise<Map<string, any>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  const out = new Map<string, any>();
  if (!ids.length) return out;
  const linked: any[] = await (prisma as any).person.findMany({
    where: { organizationId, linkedUserId: { in: ids }, active: true, ...extraWhere },
    select: { ...select, linkedUserId: true },
  });
  for (const p of linked ?? []) out.set(p.linkedUserId, p);
  const rest = ids.filter((id) => !out.has(id));
  if (!rest.length || !(prisma as any).user?.findMany) return out;
  const users: { id: string; email: string | null }[] = await (prisma as any).user
    .findMany({ where: { id: { in: rest }, deletedAt: null, OR: [{ organizationId }, { memberships: { some: { organizationId } } }] }, select: { id: true, email: true } })
    .catch(() => []);
  const byAddress = new Map((users ?? []).filter((u) => tidy(u.email)).map((u) => [tidy(u.email), u.id]));
  if (!byAddress.size) return out;
  const matched: any[] = await (prisma as any).person
    .findMany({
      where: {
        organizationId, active: true, linkedUserId: null, ...extraWhere,
        OR: [...byAddress.keys()].map((e) => ({ email: { equals: e, mode: 'insensitive' as const } })),
      },
      select: { ...select, linkedUserId: true, email: true },
    })
    .catch(() => []);
  /* An address shared by two unlinked entries says nothing about which is this person: neither. */
  const count = new Map<string, number>();
  for (const p of matched ?? []) count.set(tidy(p.email), (count.get(tidy(p.email)) ?? 0) + 1);
  for (const p of matched ?? []) {
    const userId = byAddress.get(tidy(p.email));
    if (userId && count.get(tidy(p.email)) === 1 && !out.has(userId)) out.set(userId, p);
  }
  return out;
}

/** One sign-in's roster entry, linked or matched by address. */
export async function theirRosterEntry<S extends Record<string, true>>(
  prisma: PrismaService,
  organizationId: string,
  userId: string,
  select: S,
): Promise<any | null> {
  if (!userId) return null;
  const linked = await (prisma as any).person.findFirst({ where: { organizationId, linkedUserId: userId, active: true }, select });
  if (linked) return linked;
  return (await theirRosterEntries(prisma, organizationId, [userId], select)).get(userId) ?? null;
}
