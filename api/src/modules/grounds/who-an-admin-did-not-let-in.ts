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

/*
 * NOT LET IN YET, AND SO NOT COUNTED (decision 77, 2 October 2026). In Hafsah's words: "A person an
 * admin hasn't let in yet is left out of both the 'N of M have answered' count and the count that
 * decides when a session closes. They are shown separately as waiting to be let in."
 *
 * "Not let in yet" is the hold the conversation itself refuses at the door (`awaitingOrgApproval`,
 * CANNOT_CHECK_IN_YET): still waiting for an admin, or declined by one (a decline leaves the hold on).
 * Either way they cannot answer, so no count waits on them. Once an admin lets them in the hold is
 * cleared and they are counted again, from that moment, with no other change.
 *
 * Every count and the rule that closes a session ask THIS: the pure `isNotLetInYet` for rows that
 * already carry the hold, and `whoIsNotLetInYet` where only ids are in hand.
 */

/** A row that carries the hold itself: `notLetIn`, or the user's `awaitingOrgApproval`. */
export function isNotLetInYet(p: any): boolean {
  return p?.notLetIn === true || p?.user?.awaitingOrgApproval === true;
}

export interface NotLetInYet {
  /** An admin said no, rather than not deciding yet. */
  declined: boolean;
  decidedByUserId: string | null;
  decidedAt: Date | null;
}

/**
 * Of these participants, who is not let in yet, by participant id. One read of the users' hold (the
 * rows may not carry it), and, with the organisation, whether an admin declined them.
 */
export async function whoIsNotLetInYet(
  prisma: any,
  participants: { id: string; userId?: string | null; user?: any; notLetIn?: boolean }[],
  organizationId?: string | null,
): Promise<Map<string, NotLetInYet>> {
  const out = new Map<string, NotLetInYet>();
  const rows = (participants ?? []).filter((p) => !!p?.id);
  const userIds = [...new Set(rows.map((p) => p.userId).filter((x): x is string => !!x))];
  const held = new Set<string>(rows.filter(isNotLetInYet).map((p) => p.userId ?? `#${p.id}`));
  if (userIds.length) {
    const found: any[] = await Promise.resolve(
      prisma?.user?.findMany?.({ where: { id: { in: userIds }, awaitingOrgApproval: true }, select: { id: true, awaitingOrgApproval: true } }),
    ).catch(() => []) ?? [];
    /* A double that ignores the filter must not hold everybody: only a row that says so counts. */
    for (const u of found ?? []) if (u?.id && u.awaitingOrgApproval === true) held.add(u.id);
  }
  const heldUserIds = userIds.filter((id) => held.has(id));
  const declined = organizationId && heldUserIds.length
    ? await whoAnAdminDidNotLetIn(prisma, organizationId, heldUserIds).catch(() => new Map())
    : new Map();
  for (const p of rows) {
    const key = p.userId ?? `#${p.id}`;
    if (!held.has(key)) continue;
    const d = p.userId ? declined.get(p.userId) : undefined;
    out.set(p.id, { declined: !!d, decidedByUserId: d?.decidedByUserId ?? null, decidedAt: d?.decidedAt ?? null });
  }
  return out;
}

/** The same rows, each marked `notLetIn: true` where they are not let in yet, so the counting predicates leave them out. */
export function markedNotLetIn<T extends { id: string }>(participants: T[], notLetIn: Map<string, unknown> | Set<string>): (T & { notLetIn?: boolean })[] {
  return (participants ?? []).map((p) => (notLetIn.has(p.id) ? { ...p, notLetIn: true } : p));
}

const joined = (names: string[]) => (names.length <= 1 ? names[0] ?? '' : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);
const people = (n: number) => (n === 1 ? '1 person' : `${n} people`);

/**
 * THE LINE BESIDE THE COUNT, IN PLAIN SENTENCES: "Faraji Odhiambo is waiting to be let in." Somebody
 * an admin declined "was not let in". Where this reader may not read the name (`name: null`), the
 * line counts instead: "1 person is waiting to be let in." Null when there is nobody to mention.
 * Who may read it at all is the caller's rule; this only writes it.
 */
export function theWaitingToBeLetInLine(who: { name: string | null; declined: boolean }[]): string | null {
  const out: string[] = [];
  for (const declined of [false, true]) {
    const these = (who ?? []).filter((w) => !!w.declined === declined);
    if (!these.length) continue;
    const named = these.map((w) => w.name?.trim()).filter((x): x is string => !!x);
    const unnamed = these.length - named.length;
    if (named.length) out.push(declined ? `${joined(named)} ${named.length === 1 ? 'was' : 'were'} not let in.` : `${joined(named)} ${named.length === 1 ? 'is' : 'are'} waiting to be let in.`);
    if (unnamed) {
      const subject = named.length ? (unnamed === 1 ? '1 other person' : `${unnamed} other people`) : people(unnamed);
      out.push(declined ? `${subject} ${unnamed === 1 ? 'was' : 'were'} not let in.` : `${subject} ${unnamed === 1 ? 'is' : 'are'} waiting to be let in.`);
    }
  }
  return out.length ? out.join(' ') : null;
}
