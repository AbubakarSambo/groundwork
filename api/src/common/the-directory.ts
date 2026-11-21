import { theNumberEachPersonIsReachedOn } from './the-number-each-person-is-reached-on';
import { A_COLLEAGUE_WITH_NO_NAME } from './colleagues';

/**
 * THE DESK'S DIRECTORY (S7, 20 November 2026): everyone who works in the organisation, readable by everyone in it.
 * Each row is the person's name, job title, team and who they report to. A phone number is served only to an admin, and
 * to the person on their own row, as on the People list: widening who reads numbers is Hafsah's decision (O-11).
 *
 * ONLY THIS ORGANISATION'S OWN PEOPLE, decided here on the server: never its guests, nobody still waiting to be let in,
 * and nobody who has left. Nothing else about a person leaves: no address, no load, no note, no judgement.
 */
export interface AnEntry {
  id: string;
  name: string;
  jobTitle: string | null;
  team: string | null;
  reportsTo: string | null;
  phone: string | null;
}

const nameOf = (u: { firstName?: string | null; lastName?: string | null } | null | undefined) =>
  [u?.firstName, u?.lastName].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

/**
 * THE PEOPLE ON THE ROSTER WITH NO SIGN-IN (D19): active, not a guest's entry, and not the address of somebody who signs in. The one read the directory and
 * the Desk's count both use, so "N people work here" and "Who works here" never disagree.
 */
export async function theRosterOnlyPeople(prisma: any, organizationId: string, signedInEmails: (string | null | undefined)[]): Promise<any[]> {
  const emails = new Set(signedInEmails.map((e) => String(e ?? '').toLowerCase()).filter(Boolean));
  return ((await Promise.resolve(prisma.person?.findMany?.({
    where: { organizationId, active: true, linkedUserId: null, NOT: { externalId: { startsWith: 'guest:' } } },
    select: { id: true, email: true, displayName: true, givenName: true, familyName: true, title: true, phone: true },
    take: 1000,
  })).catch(() => [])) ?? []).filter((p: any) => !(p.email && emails.has(String(p.email).toLowerCase())));
}

export async function theDirectory(prisma: any, organizationId: string, reader: { userId: string; role: string }): Promise<AnEntry[]> {
  const rows: any[] = await prisma.organizationMembership.findMany({
    where: {
      organizationId,
      role: { not: 'GUEST' },
      heldForASeat: false,
      user: { deletedAt: null, isActive: true, awaitingOrgApproval: false },
    },
    select: {
      userId: true,
      team: true,
      reportsToUserId: true,
      user: { select: { id: true, email: true, firstName: true, lastName: true, jobTitle: true, phoneNumber: true } },
    },
    take: 1000,
  });
  const here = (rows ?? []).filter((r) => r?.user);
  const names = new Map(here.map((r) => [r.userId, nameOf(r.user)]));
  const reachedOn = await theNumberEachPersonIsReachedOn(prisma, organizationId, here.map((r) => r.user));
  /*
   * AND THE PEOPLE ON THE ROSTER WHO HAVE NO SIGN-IN (Batch D, R7, D19). The 85 people a senior person works with are on the roster, written to and answered
   * on WhatsApp and by email, and the Desk said "3 people work here". Somebody on the organisation's own roster works here whether or not they ever sign in.
   * A roster entry linked to a sign-in is already listed above, and one with the address of somebody listed is the same person. A guest's entry and an
   * inactive one are not listed. Their number follows the same rule: an admin reads it, nobody else.
   */
  const roster = await theRosterOnlyPeople(prisma, organizationId, here.map((r) => r.user.email));
  const onTheRosterOnly: AnEntry[] = roster.map((p) => ({
    id: `person:${p.id}`,
    name: String(p.displayName || [p.givenName, p.familyName].filter(Boolean).join(' ')).replace(/\s+/g, ' ').trim() || A_COLLEAGUE_WITH_NO_NAME,
    jobTitle: p.title?.trim() || null,
    team: null,
    reportsTo: null,
    phone: reader.role === 'ADMIN' ? (p.phone ?? null) : null,
  }));
  return [...here
    .map((r) => ({
      id: r.userId,
      name: names.get(r.userId) || A_COLLEAGUE_WITH_NO_NAME,
      jobTitle: r.user.jobTitle?.trim() || null,
      team: r.team?.trim() || null,
      /* Only somebody who is in this organisation's own list: a manager who left, or a guest, is not named. */
      reportsTo: (r.reportsToUserId && names.get(r.reportsToUserId)) || null,
      /* Decided here, on the server: an admin reads every number, anybody else only their own. */
      phone: reader.role === 'ADMIN' || reader.userId === r.userId ? (reachedOn.get(r.userId) ?? null) : null,
    })), ...onTheRosterOnly]
    .sort((a, b) => Number(a.name === A_COLLEAGUE_WITH_NO_NAME) - Number(b.name === A_COLLEAGUE_WITH_NO_NAME) || a.name.localeCompare(b.name));
}
