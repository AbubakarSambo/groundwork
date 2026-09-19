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

/**
 * WHAT COVERS THIS ORGANISATION TODAY: paid, on the house, or the free tier.
 *
 * "We put in someone's email and their org gets free use for three months." The shortcut is to
 * write `subscriptionStatus: 'active'` and a plan on that organisation, because every gate in the
 * product already reads exactly those two fields. It is also how a free run becomes permanent: that
 * pair carries no end date, so the run stops only if something remembers to stop it.
 *
 * So a free run is its own pair - `freeUntil` and `freePlan` - and this is the one place that reads
 * all four fields together. It expires by arithmetic rather than by a cron, which means the failure
 * mode of every bug in here is that somebody is charged too early rather than never charged at all.
 *
 * PAYING WINS. An organisation that started paying during a free run is a customer: their plan is
 * the one they chose, not the one we gave them, and the free run simply runs out underneath.
 */
export type WhatCovers = 'paid' | 'on the house' | 'free tier';

export function whatCoversThem<T extends {
  subscriptionPlan: unknown;
  subscriptionStatus: string | null | undefined;
  freeUntil?: Date | null;
  freePlan?: unknown;
}>(org: T, now: Date = new Date()): { covers: WhatCovers; plan: NonNullable<T['subscriptionPlan']> | null; until: Date | null } {
  if (isSubscribed(org)) return { covers: 'paid', plan: org.subscriptionPlan as any, until: null };
  const until = org.freeUntil ? new Date(org.freeUntil) : null;
  if (until && until.getTime() > now.getTime() && org.freePlan) {
    return { covers: 'on the house', plan: org.freePlan as any, until };
  }
  return { covers: 'free tier', plan: null, until: null };
}

/** Whether anything at all covers them beyond the free tier. The read most gates want. */
export function isCovered<T extends Parameters<typeof whatCoversThem>[0]>(org: T, now?: Date): boolean {
  return whatCoversThem(org, now).covers !== 'free tier';
}

/** The last day of a free run, from the day it is taken up. Whole months, so three means three. */
export function aFreeRunEndsOn(from: Date, months: number): Date {
  const end = new Date(from);
  end.setMonth(end.getMonth() + months);
  return end;
}
