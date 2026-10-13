import { isAnAdminOf, needsApproval, whoToAsk } from './nobody-joins-your-company-by-being-invited-to-a-check-in';

/**
 * WHO GOES STRAIGHT IN, AND WHO WAITS FOR AN ADMIN (Hafsah, 12 October 2026).
 *
 * "Invitees: people listed on a check-in when an admin approves it go straight in; people a non-admin lead adds
 * afterwards wait for an admin, as production does. The invitation and invite page say plainly which applies."
 *
 * An admin approving a check-in has seen who is on it, so everybody on it at that moment was let in by that
 * admin. Somebody a lead who is not an admin adds after the approval still waits, exactly as before. Somebody an
 * admin added, somebody already in the organisation, and somebody from another organisation (a guest) never wait.
 */
export interface TheGround { organizationId: string; initiatorId: string; approvedById?: string | null; approvedAt?: Date | string | null }
export interface TheRow { createdAt?: Date | string | null; addedByUserId?: string | null }

/** True when this row was on the check-in when an admin of its organisation approved it. */
export function namedWhenAnAdminApproved(ground: TheGround, row: TheRow, approver: { role?: string | null; organizationId?: string | null } | null): boolean {
  if (!ground.approvedById || !ground.approvedAt || !row.createdAt) return false;
  if (new Date(row.createdAt).getTime() > new Date(ground.approvedAt).getTime()) return false;
  return isAnAdminOf(ground.organizationId, approver as any);
}

/** Whether this person, arriving now, waits for an admin. The same rule accept() applies. */
export async function theyWaitForAnAdmin(db: any, ground: TheGround, row: TheRow & { email: string }): Promise<boolean> {
  const user = await db.user.findUnique({ where: { email: row.email.toLowerCase() }, select: { id: true, organizationId: true } }).catch(() => null);
  const alreadyAMemberHere = user
    ? user.organizationId === ground.organizationId
      || !!(await db.organizationMembership?.findUnique?.({ where: { userId_organizationId: { userId: user.id, organizationId: ground.organizationId } }, select: { id: true } }).catch(() => null))
    : false;
  const inviter = await db.user.findUnique({ where: { id: whoToAsk(row.addedByUserId, ground.initiatorId) }, select: { role: true, organizationId: true } }).catch(() => null);
  const approver = ground.approvedById
    ? await db.user.findUnique({ where: { id: ground.approvedById }, select: { role: true, organizationId: true } }).catch(() => null)
    : null;
  return needsApproval({
    groundOrganizationId: ground.organizationId,
    theirHomeOrganizationId: user?.organizationId ?? null,
    alreadyAMemberHere,
    addedByAnAdminOfThisOrg: isAnAdminOf(ground.organizationId, inviter) || namedWhenAnAdminApproved(ground, row, approver),
  });
}

/** The one plain sentence the invitation and the invite page say. */
export function whatHappensWhenYouJoin(waits: boolean, organisationName: string | null): string {
  const org = organisationName?.trim() || 'the organisation';
  return waits
    ? `When you join, an admin at ${org} has to let you in before you can check in, and you will be told by email when they have.`
    : 'When you join, you go straight in and can check in at once.';
}
