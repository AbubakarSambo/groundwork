import { BadRequestException, ForbiddenException } from '@nestjs/common';

/**
 * THE ROLE AN INVITATION GIVES, AND WHO MAY GIVE IT: ONE RULE FOR EVERY ROUTE THAT ADDS PEOPLE (U.4; Hafsah, 21 November 2026).
 *
 * "Admin", "Can open check-ins", "Takes part", and "Guest" while the organisation lets guests join. Anything else is refused
 * rather than read as a member, so a typo never quietly invites someone as the wrong thing.
 *
 * Two settings under "Who can join" on People decide it, both on the organisation row and both off by default, so an
 * organisation already here reads exactly as before:
 *
 *   guestsMayJoin     a guest is the existing GUEST role, the one a lead's guest on one check-in holds: they see only the
 *                     check-ins they are added to. Off, nobody is invited into the organisation as a guest.
 *   whoMayAddPeople   "ADMINS" (the default) or "ANYONE". With "ANYONE", anybody here who is not a guest may invite people as
 *                     "Takes part", and only that. An admin, a lead's power or an owner is never given by a member.
 *
 * The plan's seats are a separate question, asked where a person is actually added (`BillingService.canInviteMember`).
 * The screens read `theRolesTheyMayGive` served on GET /users/organization/adding-people and on the signed-in user
 * (`mayAddPeople`), so the page and the server cannot disagree; the server asks again on every invitation.
 */
export type AnInvitedRole = 'ADMIN' | 'LEAD' | 'MEMBER' | 'GUEST';
export type WhoMayAddPeople = 'ADMINS' | 'ANYONE';

export interface HowPeopleJoinHere {
  guestsMayJoin: boolean;
  whoMayAddPeople: WhoMayAddPeople;
}

/** What an organisation reads before an admin has changed either setting, and what a missing row reads as. */
export const HOW_A_NEW_ORG_ADDS_PEOPLE: HowPeopleJoinHere = { guestsMayJoin: false, whoMayAddPeople: 'ADMINS' };

export const ONLY_ADMINS_ADD_PEOPLE = 'Only an admin can add people here. Ask an admin to invite them.';
export const ONLY_AS_TAKES_PART = 'You can invite people as “Takes part”. Only an admin can give someone another role.';
export const GUESTS_CANNOT_JOIN = 'Guests cannot join this organisation. An admin can turn this on under Who can join on People.';

/** Reads the two columns as the rule's shape. A value the rule does not know is read as the stricter setting. */
export function howPeopleJoinHere(org: { guestsMayJoin?: boolean | null; whoMayAddPeople?: string | null } | null | undefined): HowPeopleJoinHere {
  return {
    guestsMayJoin: org?.guestsMayJoin === true,
    whoMayAddPeople: org?.whoMayAddPeople === 'ANYONE' ? 'ANYONE' : 'ADMINS',
  };
}

/** The roles this person may invite somebody as, in the order the page offers them. Empty: they may not invite at all. */
export function theRolesTheyMayGive(inviterRole: string | null | undefined, how: HowPeopleJoinHere): AnInvitedRole[] {
  if (inviterRole === 'ADMIN') return how.guestsMayJoin ? ['MEMBER', 'LEAD', 'ADMIN', 'GUEST'] : ['MEMBER', 'LEAD', 'ADMIN'];
  if (how.whoMayAddPeople === 'ANYONE' && (inviterRole === 'LEAD' || inviterRole === 'MEMBER')) return ['MEMBER'];
  return [];
}

/** The role asked for, if this person may give it; otherwise refused in a sentence that says what they can do. */
export function aRoleToInviteAs(role: string | undefined | null, inviterRole: string | null | undefined, how: HowPeopleJoinHere): AnInvitedRole {
  const may = theRolesTheyMayGive(inviterRole, how);
  if (!may.length) throw new ForbiddenException(ONLY_ADMINS_ADD_PEOPLE);
  const wanted = role == null || role === '' ? 'MEMBER' : role;
  if ((may as string[]).includes(wanted)) return wanted as AnInvitedRole;
  if (inviterRole !== 'ADMIN') throw new ForbiddenException(ONLY_AS_TAKES_PART);
  if (wanted === 'GUEST') throw new BadRequestException(GUESTS_CANNOT_JOIN);
  throw new BadRequestException(how.guestsMayJoin
    ? 'Choose Admin, Can open check-ins, Takes part, or Guest.'
    : 'Choose Admin, Can open check-ins, or Takes part.');
}

/** The role joining through the invite link gives: "Guest" only while the admin chose it and guests may join. */
export function theRoleTheLinkGives(org: { guestsMayJoin?: boolean | null; inviteLinkRole?: string | null } | null | undefined): 'MEMBER' | 'GUEST' {
  return org?.guestsMayJoin === true && org?.inviteLinkRole === 'GUEST' ? 'GUEST' : 'MEMBER';
}

/** Somebody's role here, read from their membership, and nobody's while they still wait to be let in. */
interface ReadsWhoIsHere {
  organization: { findUnique(args: any): Promise<any> };
  organizationMembership: { findUnique(args: any): Promise<any> };
  user: { findUnique(args: any): Promise<any> };
}

/**
 * THE ONE CHECK EVERY INVITE ROUTE MAKES: reads the organisation's two settings and the inviter's own membership here, and
 * returns the role they may give, or throws. The membership, not the account's `role` column, because that column is only
 * the role in whichever organisation they last switched to.
 */
export async function theRoleThisPersonMayGive(
  prisma: ReadsWhoIsHere,
  organizationId: string,
  inviterId: string,
  role: string | undefined | null,
): Promise<AnInvitedRole> {
  const [org, membership, inviter] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId }, select: { guestsMayJoin: true, whoMayAddPeople: true } }),
    prisma.organizationMembership.findUnique({ where: { userId_organizationId: { userId: inviterId, organizationId } }, select: { role: true } }),
    prisma.user.findUnique({ where: { id: inviterId }, select: { awaitingOrgApproval: true } }),
  ]);
  const theirRole = inviter?.awaitingOrgApproval ? null : (membership?.role ?? null);
  return aRoleToInviteAs(role, theirRole, howPeopleJoinHere(org));
}
