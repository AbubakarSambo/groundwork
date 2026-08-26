/**
 * WHAT "PAYING" MEANS, ONCE, AND WHY THIS FILE EXISTS.
 *
 * `Organization.subscriptionStatus` is a bare nullable String compared against the lowercase literal
 * 'active' in six places, with 'paused', 'cancelled' and 'past_due' written as loose literals in four
 * more. Nothing type-checks any of it.
 *
 * THE FAILURE MODE IS REVENUE, NOT TIDINESS. Write 'ACTIVE' instead of 'active' - a plausible thing
 * for a human, a script, or a future integration to do - and every one of those comparisons quietly
 * says no. `canCreateGround` falls straight through to the free-tier check, so a paying organisation
 * is metered as if it had never paid. Nothing throws, nothing logs, no test fails. This was found by
 * setting the field by hand on a dev org and watching the paid account keep its free-tier banner.
 *
 * The values themselves come from Stripe, which is lowercase and snake_case, so the CASING IS
 * CORRECT AS IT STANDS - the problem is that nothing says so. Hence a union type rather than a
 * rename: anything writing the wrong shape becomes a compile error instead of a silent downgrade.
 *
 * The stored column stays a String. It is written by webhook payloads we do not fully control, and a
 * Prisma enum would make an unrecognised Stripe status a write failure rather than a value we can
 * read and reason about. `isSubscribed` treats anything it does not recognise as not paying, which is
 * the safe direction: it fails toward the free tier, never toward free service.
 */

/** The statuses this product writes and reads. Lowercase, matching Stripe. */
export const SUBSCRIPTION_STATUSES = ['active', 'paused', 'cancelled', 'past_due'] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** The one that means "this organisation is paying right now". */
export const ACTIVE: SubscriptionStatus = 'active';

/**
 * The single definition of a paying organisation.
 *
 * BOTH HALVES ARE REQUIRED, and that is not belt-and-braces. A cancelled org keeps its
 * `subscriptionStatus` history while `subscriptionPlan` is nulled, and a plan can be set before a
 * first payment settles. Either alone has been wrong at some point in this table's life.
 */
export function isSubscribed<T extends { subscriptionPlan: unknown; subscriptionStatus: string | null | undefined }>(
  org: T,
): org is T & { subscriptionPlan: NonNullable<T['subscriptionPlan']> } {
  /**
   * A TYPE PREDICATE, NOT A BOOLEAN, because the inline condition it replaces did two jobs.
   *
   * `org.subscriptionPlan && org.subscriptionStatus === 'active'` also NARROWED the plan to non-null
   * for everything after it, so callers could pass it straight to `memberCapFor`. A plain boolean
   * function loses that, and the first call site failed to compile with "SubscriptionPlan | null is
   * not assignable" - which is the compiler correctly pointing out that the guarantee had been
   * dropped. Returning a predicate keeps both jobs in one place.
   */
  return !!org.subscriptionPlan && org.subscriptionStatus === ACTIVE;
}

/** True when the stored value is one this product recognises. Anything else is not paying. */
export function isKnownStatus(value: string | null | undefined): value is SubscriptionStatus {
  return !!value && (SUBSCRIPTION_STATUSES as readonly string[]).includes(value);
}
