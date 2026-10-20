/**
 * THE DIRECT MORNING, A SWITCH PER ORGANISATION (Hafsah, 20 October 2026).
 *
 * WHERE IT IS KEPT. `Organization.directMorningOn`, false for every organisation until it is set on for one organisation at a time by
 * `scripts/the-direct-morning.ts <organisation id> on --yes` (docs/deploy.md: Abubakar sets it on for Drop Access in production, after
 * Release 1's switch).
 *
 * WHAT IT CHANGES, ON, AND ONLY THAT (the final surface; every writer runs either way):
 *  - the lead's morning summary (lead_daily_summary's {{2}}, its email form and its subject): the target, what needs her, what is about to
 *    close and who on the team needs her, with names, numbers, customers and days (engagement/the-direct-morning.ts);
 *  - the top of her board: the same four parts in the same order, then the board as it is;
 *  - each team member's opening: one personal question about the one thing that matters to them today;
 *  - the fixed words around them: no explanation of Groundwork and no privacy note in a message, and nothing that hedges.
 * Who can see what never changes with it: the backend's privacy rules are the same either way. Nothing a person's judgements switch
 * (`person_judgements_on`) holds back is ever said because of it.
 *
 * READ ONCE PER CALL. A database with no such row, or a row that cannot be read, reads as off: everybody reads what they read today.
 */
export const THE_DIRECT_MORNING = 'directMorningOn';

type Reader = { organization?: { findUnique?: (a: any) => Promise<any> } } | any;

export async function theDirectMorningIsOn(prisma: Reader, organizationId: string | null | undefined): Promise<boolean> {
  if (!organizationId) return false;
  const find = prisma?.organization?.findUnique;
  if (typeof find !== 'function') return false;
  try {
    const org = await find.call(prisma.organization, { where: { id: organizationId }, select: { directMorningOn: true } });
    return org?.directMorningOn === true;
  } catch {
    return false;
  }
}

/** The same, for the organisation a check-in belongs to. */
export async function theDirectMorningIsOnFor(prisma: Reader, groundId: string | null | undefined): Promise<boolean> {
  if (!groundId) return false;
  const find = prisma?.ground?.findUnique;
  if (typeof find !== 'function') return false;
  try {
    const g = await find.call(prisma.ground, { where: { id: groundId }, select: { organizationId: true } });
    return theDirectMorningIsOn(prisma, g?.organizationId ?? null);
  } catch {
    return false;
  }
}
