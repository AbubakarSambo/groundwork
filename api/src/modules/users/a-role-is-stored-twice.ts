import { Prisma } from '@prisma/client';

/**
 * A PERSON'S ROLE IS STORED IN TWO PLACES AND ONLY ONE OF THEM WAS EVER WRITTEN.
 *
 * `User.role` is the authority: the roles guard reads it, the session carries it, every page in the
 * product branches on it. `OrganizationMembership.role` is read by one thing, the organisation
 * switcher - and nothing wrote it after the row was created.
 *
 * So promoting somebody to admin gave them admin everywhere that matters and left them a member in
 * the switcher. Nothing threw. `myOrganizations` even carries self-healing code for a user whose
 * active organisation has no membership row, which is the same family of problem noticed once and
 * patched at the read instead of the write.
 *
 * WHY A FUNCTION RATHER THAN TWO LINES AT THE CALL SITE. Two lines at the call site is the state
 * this was already in - `update()` wrote one column and the second was a thing somebody had to
 * remember. A second writer will be added eventually (an admin page, an import, SCIM), and it will
 * remember or it will not. This is the only way to set a role, so there is nothing to remember.
 *
 * IN A TRANSACTION, because a promotion that half-lands is worse than one that fails: the person
 * holds admin in the session with no membership record saying why, and no error was raised to tell
 * anybody.
 */
/**
 * The three a person can be. LEAD sets up check-ins for their own team and holds no admin powers -
 * see the schema, and `who-may-open-a-check-in.ts` for what it actually permits.
 */
export type RoleWrite = 'ADMIN' | 'LEAD' | 'MEMBER';

/**
 * Write a role to both places it lives.
 *
 * Takes a transaction client so a caller already inside one - `update()` doing several things at
 * once - does not open a second and deadlock against itself.
 *
 * The membership row is UPDATED, never created: a user with no membership for this organisation is
 * a different condition with a different cause, and quietly conjuring one here would hide it.
 * `updateMany` rather than `update` for exactly that reason - no row is not an error.
 */
export async function setRole(
  tx: Prisma.TransactionClient,
  userId: string,
  organizationId: string,
  role: RoleWrite,
): Promise<void> {
  await tx.user.update({ where: { id: userId }, data: { role: role as any } });
  await tx.organizationMembership.updateMany({
    where: { userId, organizationId },
    data: { role: role as any },
  });
}
