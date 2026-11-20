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
  return here
    .map((r) => ({
      id: r.userId,
      name: names.get(r.userId) || A_COLLEAGUE_WITH_NO_NAME,
      jobTitle: r.user.jobTitle?.trim() || null,
      team: r.team?.trim() || null,
      /* Only somebody who is in this organisation's own list: a manager who left, or a guest, is not named. */
      reportsTo: (r.reportsToUserId && names.get(r.reportsToUserId)) || null,
      /* Decided here, on the server: an admin reads every number, anybody else only their own. */
      phone: reader.role === 'ADMIN' || reader.userId === r.userId ? (reachedOn.get(r.userId) ?? null) : null,
    }))
    .sort((a, b) => Number(a.name === A_COLLEAGUE_WITH_NO_NAME) - Number(b.name === A_COLLEAGUE_WITH_NO_NAME) || a.name.localeCompare(b.name));
}
