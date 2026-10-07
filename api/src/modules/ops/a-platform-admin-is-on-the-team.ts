import { OpsFunctionalRole } from '@prisma/client';
import { DEFAULT_GRANTS } from './what-somebody-may-do';

/**
 * THE PLATFORM-ADMIN LIST AND THE OPS TEAM ARE ONE LIST.
 *
 * They were two, and the reasoning was that running the platform and being on
 * this company's team are different jobs. In a company this size they are not:
 * the platform-admin list is short, every addition to it needs an existing
 * admin and an emailed code, and the effect of keeping them apart was that the
 * person who owns the company had to connect her own account before she could
 * open her own back office — and then, having done it on one account, was
 * refused on another. Decided 2026-09-05.
 *
 * IT IS NOT AN ESCALATION, WHICH IS WHY IT IS SAFE. A platform admin already
 * reads every customer organisation, every usage figure and the pricing. Our
 * own targets and our own spend are strictly less sensitive than what that list
 * already carries. Nothing here opens a door that was closed to them.
 *
 * What it does open is CEO-level grants inside the ops system, including
 * spend:approve. That is deliberate too: "nobody approves their own spend" is
 * enforced on identity rather than capability, so more holders makes the rule
 * work rather than weaker — the CEO's own claims had nobody who could decide
 * them precisely because she was the only holder.
 *
 * Grants stay rows. Somebody auto-admitted can have any capability revoked
 * afterwards, and revoking is never undone by the roll-out.
 */

/** The role somebody admitted this way is created as. */
export const ROLE_FOR_A_PLATFORM_ADMIN: OpsFunctionalRole = 'CEO';

export const GRANTS_FOR_A_PLATFORM_ADMIN = DEFAULT_GRANTS[ROLE_FOR_A_PLATFORM_ADMIN];

/**
 * A stable, readable key from an address.
 *
 * The local part only: `hafsah.ops@myground.work` becomes `hafsah-ops`. The key
 * appears in URLs and in every record that names a person, so it has to be
 * something somebody can read back — and it must not carry the domain, because
 * the same person moving domains should not become a second person. Watched
 * that work: `hafsah.ops@groundwork.test` made the record and
 * `hafsah.ops@myground.work` was linked to it rather than duplicating her.
 *
 * THE COST, SAID OUT LOUD: two different people who share a local part on
 * different domains collapse into one record — `james@a.test` and
 * `james@b.test` would be the same person here. That is the wrong trade at a
 * hundred people and the right one at six, where the alternative is a duplicate
 * every time somebody signs in with their other address. It is only ever
 * reached by somebody already on the platform-admin list, which is short and
 * gated; if that list grows past a handful, key on the whole address instead.
 */
export function keyForAccount(email: string): string {
  const local = email.split('@')[0] ?? '';
  const key = local
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return key || 'admin';
}

/** What to call them, given whatever the account happens to carry. */
export function nameForAccount(account: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}): string {
  const named = [account.firstName, account.lastName].filter((t) => t && !t.includes('@')).join(' ').trim();
  /* Never the address in place of a name (Hafsah, 6 October). */
  return named || 'Someone';
}
