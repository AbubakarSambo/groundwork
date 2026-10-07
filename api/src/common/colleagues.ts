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
/** What a colleague who has not given a name is called in the list: an address is never a name (decision 115), and they must still be pickable. */
export const A_COLLEAGUE_WITH_NO_NAME = 'Someone who has not given a name yet';

export function onlyNameRoleAndTeam(row: { userId: string; role: string; team: string | null; user: { firstName: string | null; lastName: string | null } }): AColleague | null {
  const name = [row.user.firstName, row.user.lastName].filter(Boolean).join(' ').trim();
  /* Left out, this person could not be picked at all: seven of eleven colleagues at an organisation made before the rebuild. */
  return { id: row.userId, name: name || A_COLLEAGUE_WITH_NO_NAME, role: row.role, team: row.team ?? null };
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
    .sort((a, b) => Number(a.name === A_COLLEAGUE_WITH_NO_NAME) - Number(b.name === A_COLLEAGUE_WITH_NO_NAME) || a.name.localeCompare(b.name) || String(a.team).localeCompare(String(b.team)));
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
  const found = await theColleaguePickedById(db, organizationId, userId);
  return found?.email ?? null;
}

/**
 * THE COLLEAGUE PICKED BY ID, ADDRESS AND NAME BOTH (U.8 re-review).
 *
 * Adding somebody from the colleague list is not a cold, typed-email invite: the id sent here is
 * their real account, so their real name is already known, before they have accepted anything. The
 * add path used to keep only the address and throw the id away, so the participant row was created
 * exactly as bare as a stranger's typed email would be - and every screen that reads a participant's
 * name falls back to guessing one from the address when nothing else is there. That produced "Amani
 * U8" for somebody whose account is named Amani Wekesa, picked by the lead from her own list.
 *
 * `nameGiven` is the field every reader already treats as the name to show before `user.firstName`
 * is available (see `theirName` in client/src/lib/utils.ts, and the engine's own `party-labels.ts`),
 * so writing the colleague's real name there at add-time fixes every one of those readers at once,
 * without changing when a participant is treated as having actually joined - `userId` still stays
 * null until they accept, exactly as before.
 */
export async function theColleaguePickedById(
  db: { organizationMembership: { findFirst: (a: any) => Promise<any> } },
  organizationId: string,
  userId: string,
): Promise<{ email: string; name: string | null } | null> {
  const m = await db.organizationMembership.findFirst({
    where: { organizationId, userId, user: { deletedAt: null, isActive: true } },
    select: { user: { select: { email: true, firstName: true, lastName: true } } },
  });
  if (!m?.user?.email) return null;
  const name = [m.user.firstName, m.user.lastName].filter(Boolean).join(' ').trim();
  return { email: m.user.email, name: name || null };
}

export const NOT_SOMEONE_HERE = 'That person is not in this organisation. Add them by their email address instead.';

/**
 * THE NAME OF SOMEBODY ALREADY IN THE ORGANISATION, WHO WAS ADDED BY THEIR ADDRESS (user journeys, F-7).
 *
 * Added by email, a person who already works here had no name on their row until they opened the invitation, so the roster, the board and the setup page
 * called them by their address, "Somebody invited by email" or "A colleague". Their name is on their membership. Only members of this organisation, and only
 * ever the name: nothing else about them travels with it.
 */
export async function theMemberWithThisAddress(
  db: { organizationMembership?: { findFirst?: (a: any) => Promise<any> } },
  organizationId: string,
  email: string,
): Promise<{ name: string | null } | null> {
  const find = db.organizationMembership?.findFirst;
  if (!find || !email) return null;
  const m = await find.call(db.organizationMembership, {
    where: { organizationId, user: { email: email.toLowerCase(), deletedAt: null, isActive: true } },
    select: { user: { select: { firstName: true, lastName: true } } },
  }).catch(() => null);
  const name = [m?.user?.firstName, m?.user?.lastName].filter(Boolean).join(' ').trim();
  return m?.user ? { name: name || null } : null;
}

/** Rows with no name and no account yet are given their member's name, once, for the read. Nothing is written. */
export async function withTheirNamesFromTheOrganisation<P extends { email?: string | null; nameGiven?: string | null; user?: unknown }>(
  db: { organizationMembership?: { findMany?: (a: any) => Promise<any> } },
  organizationId: string,
  participants: P[],
): Promise<P[]> {
  const bare = participants.filter((p) => !p.user && !(p.nameGiven ?? '').trim() && !!p.email);
  const find = db.organizationMembership?.findMany;
  if (!bare.length || !find) return participants;
  const rows: any[] = await find.call(db.organizationMembership, {
    where: { organizationId, user: { email: { in: [...new Set(bare.map((p) => String(p.email).toLowerCase()))] }, deletedAt: null, isActive: true } },
    select: { user: { select: { email: true, firstName: true, lastName: true } } },
  }).then((r: any) => (Array.isArray(r) ? r : [])).catch(() => []);
  const nameOf = new Map<string, string>();
  for (const r of rows) {
    const name = [r?.user?.firstName, r?.user?.lastName].filter(Boolean).join(' ').trim();
    if (r?.user?.email && name) nameOf.set(String(r.user.email).toLowerCase(), name);
  }
  for (const p of bare) {
    const name = nameOf.get(String(p.email).toLowerCase());
    if (name) (p as any).nameGiven = name;
  }
  return participants;
}
