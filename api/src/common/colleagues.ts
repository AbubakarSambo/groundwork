/**
 * WHO SOMEBODY MAY SEE AS A COLLEAGUE, AND WHAT THEY SEE OF THEM (U.4).
 *
 * Hafsah, 26 September 2026: a member seeing colleagues' names, roles and teams is fine, as the
 * prototype's People page shows. A guest from another organisation sees only the people in their own
 * check-in. Nobody sees anyone's load, private notes, or anything beyond name, role and team.
 *
 * `/users/colleagues` used to return every person's email address to any member, and to a guest who
 * had switched into the organisation too, because it asked only "who has this organisation as their
 * current one". So:
 *
 *   - a member (admin, lead, takes part) sees the organisation's own people, not its guests and not
 *     anybody still waiting to be let in;
 *   - a guest, or somebody still waiting to be let in, sees only the people on the check-ins they
 *     are on here;
 *   - and each row is an id (to pick them by), their name, their role and their team. No address.
 *     Adding a colleague to a check-in sends the id, and the server looks the address up.
 *
 * Built from the memberships, not from `User.organizationId`: that column is whichever organisation
 * a person last switched to, so somebody who belongs here but was looking at another company fell off
 * the list, and a guest looking at this one was on it.
 */
import { Prisma } from '@prisma/client';

export interface AColleague {
  id: string;
  name: string;
  role: string;
  team: string | null;
}

type Db = {
  organizationMembership: { findUnique: (a: any) => Promise<any>; findMany: (a: any) => Promise<any[]> };
  user: { findUnique: (a: any) => Promise<any> };
  groundParticipant: { findMany: (a: any) => Promise<any[]> };
};

/** An outsider here: a guest from another organisation, or somebody not yet let in, or not a member at all. */
export function isAnOutsiderHere(membershipRole: string | null | undefined, awaitingOrgApproval: boolean): boolean {
  return !membershipRole || membershipRole === 'GUEST' || awaitingOrgApproval;
}

/** The only fields that ever leave. Anything else on the row is dropped here, whatever the query selected. */
export function onlyNameRoleAndTeam(row: { userId: string; role: string; team: string | null; user: { firstName: string | null; lastName: string | null } }): AColleague | null {
  const name = [row.user.firstName, row.user.lastName].filter(Boolean).join(' ').trim();
  if (!name) return null;
  return { id: row.userId, name, role: row.role, team: row.team ?? null };
}

export async function colleaguesOf(db: Db, organizationId: string, callerId: string): Promise<AColleague[]> {
  const [mine, me] = await Promise.all([
    db.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: callerId, organizationId } },
      select: { role: true },
    }),
    db.user.findUnique({ where: { id: callerId }, select: { awaitingOrgApproval: true, email: true } }),
  ]);
  const outsider = isAnOutsiderHere(mine?.role, !!me?.awaitingOrgApproval);

  let onlyThese: string[] | null = null;
  if (outsider) {
    /* Their own check-ins here, including one they were added to and have not opened yet, found by
       the address the invitation went to (U.4 review): a guest is a guest from the moment they are added. */
    const myRows = await db.groundParticipant.findMany({
      where: {
        ground: { organizationId },
        OR: [{ userId: callerId }, ...(me?.email ? [{ userId: null, email: String(me.email).toLowerCase() }] : [])],
      },
      select: { groundId: true },
    });
    const groundIds = [...new Set(myRows.map((r: any) => r.groundId as string))];
    if (!groundIds.length) return [];
    const theirs = await db.groundParticipant.findMany({
      where: { groundId: { in: groundIds }, userId: { not: null } },
      select: { userId: true },
    });
    onlyThese = [...new Set(theirs.map((r: any) => r.userId as string))].filter((id) => id !== callerId);
    if (!onlyThese.length) return [];
  }

  const where: Prisma.OrganizationMembershipWhereInput = {
    organizationId,
    userId: onlyThese ? { in: onlyThese, not: callerId } : { not: callerId },
    user: { deletedAt: null, isActive: true, isEmailVerified: true, awaitingOrgApproval: false },
    /* A member does not see the organisation's guests; a guest sees whoever is on their check-ins. */
    ...(outsider ? {} : { role: { not: 'GUEST' as any } }),
  };
  const rows = await db.organizationMembership.findMany({
    where,
    select: { userId: true, role: true, team: true, user: { select: { firstName: true, lastName: true } } },
    take: 500,
  });
  return rows
    .map(onlyNameRoleAndTeam)
    .filter((c): c is AColleague => c !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * THE ADDRESS OF A COLLEAGUE PICKED BY ID, looked up on the server when they are added to a check-in,
 * so the list itself never has to carry addresses. Only somebody who belongs to this organisation.
 */
export async function theAddressOfAColleague(
  db: { organizationMembership: { findFirst: (a: any) => Promise<any> } },
  organizationId: string,
  userId: string,
): Promise<string | null> {
  const m = await db.organizationMembership.findFirst({
    where: { organizationId, userId, user: { deletedAt: null, isActive: true } },
    select: { user: { select: { email: true } } },
  });
  return m?.user?.email ?? null;
}

export const NOT_SOMEONE_HERE = 'That person is not in this organisation. Add them by their email address instead.';
