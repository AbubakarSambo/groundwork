/**
 * WHICH PRIORITY A CHECK-IN FEEDS (round 2, T4 and browser test row 40, 20 November 2026).
 *
 * A check-in fed a priority only when it was tied to it (`subjectExternalId`), and only the organisation's own system or
 * the API ever tied one. So Wairimu owns Priority 1 and runs "Sales team, Q4", and the Desk said "No check-in feeds this
 * priority yet". One rule, read by both the Desk (the-company-page.ts, through company.service.ts) and the company picture
 * (the-company-picture.service.ts): a check-in feeds what it is tied to; one tied to nothing feeds the priority its lead
 * owns, when the lead owns exactly one. A lead who owns several is not guessed for.
 */
export interface AGround { id: string; initiatorId: string | null; subjectExternalId: string | null }
export interface APriority { externalId: string; ownerExternalId: string | null; parentExternalId?: string | null; type?: string; sourceDeletedAt?: Date | null }

export function whatEachCheckInFeeds(
  grounds: AGround[],
  subjects: APriority[],
  /** The organisation's person record behind each sign-in: userId to externalId. */
  personOfUser: Map<string, string>,
): Map<string, string | null> {
  const top = subjects.filter((s) => (s.type ?? 'OBJECTIVE') === 'OBJECTIVE' && !s.parentExternalId && !s.sourceDeletedAt);
  const out = new Map<string, string | null>();
  for (const g of grounds) {
    if (g.subjectExternalId) { out.set(g.id, g.subjectExternalId); continue; }
    const lead = g.initiatorId ? personOfUser.get(g.initiatorId) : undefined;
    const owned = lead ? top.filter((s) => s.ownerExternalId === lead) : [];
    out.set(g.id, owned.length === 1 ? owned[0].externalId : null);
  }
  return out;
}

/** Read from the database: each check-in of one organisation with what it feeds, and only those that feed something. */
export async function theCheckInsThatFeedAPriority(prisma: any, organizationId: string, subjects: APriority[], groundWhere: Record<string, unknown> = {}): Promise<{ id: string; subjectExternalId: string }[]> {
  const grounds: AGround[] = (await prisma.ground.findMany({ where: { organizationId, ...groundWhere }, select: { id: true, initiatorId: true, subjectExternalId: true } })) ?? [];
  const leads = [...new Set(grounds.filter((g) => !g.subjectExternalId && g.initiatorId).map((g) => g.initiatorId as string))];
  const persons: { externalId: string; linkedUserId: string | null }[] = leads.length
    ? ((await Promise.resolve(prisma.person?.findMany?.({ where: { organizationId, linkedUserId: { in: leads } }, select: { externalId: true, linkedUserId: true } })).catch(() => [])) ?? [])
    : [];
  const personOfUser = new Map(persons.filter((p) => p.linkedUserId).map((p) => [p.linkedUserId as string, p.externalId]));
  const feeds = whatEachCheckInFeeds(grounds, subjects, personOfUser);
  return grounds.flatMap((g) => { const s = feeds.get(g.id); return s ? [{ id: g.id, subjectExternalId: s }] : []; });
}
