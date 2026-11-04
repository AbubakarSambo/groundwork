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

/**
 * THE FOUR WEEKS AFTER A FREE TRIAL, AND THE PAUSE AFTER THEM (Hafsah, 2 November 2026).
 *
 * "Every organisation on a free trial gets 4 more weeks after its trial ends, then Groundwork pauses until they pay." This is the
 * one place that says where an organisation stands, by arithmetic on its own dates, exactly as the free run above: nothing writes
 * "paused" on a row, so paying lifts it the moment the subscription is recorded, and a longer setting moves every date at once.
 *
 *   - a customer: it pays, or it has paid before (any subscription status at all, or a care fee). Unchanged by any of this.
 *   - not on a trial: no free month, or the free trial's switch is off.
 *   - in its trial: its free month is running.
 *   - after its trial: the four weeks. Everything keeps working, on the trial's plan.
 *   - paused: past the four weeks. No check-in opens and nothing Groundwork starts goes out, until it pays. Nothing is deleted.
 *
 * A FREE MONTH is the free trial's (`freeTrialStartedAt`) or the month every organisation already here was given
 * (`freeMonthOfReleaseAt`), the same two the free-month emails write about. A free run staff gave by hand is not a free month.
 *
 * NOBODY IS PAUSED WITHOUT THEIR FOUR WEEKS. The weeks start when the free month ends, or when the rule came in (`notBefore`: the
 * later of the moment the grace setting was written and the moment the free trial's switch went on), whichever is later. So an
 * organisation whose free month ended long before the rule existed gets its four weeks, and its emails, from the day it arrived.
 */
export interface TheGrace {
  weeks: number;
  notBefore: Date | null;
}

export type WhereTheTrialStands = 'a customer' | 'not on a trial' | 'in its trial' | 'after its trial' | 'paused';

/** The fields an organisation is read with to know what covers it and where its trial stands. */
export const WHAT_COVER_READS = {
  subscriptionPlan: true, subscriptionStatus: true, careFeeStatus: true,
  freeUntil: true, freePlan: true, freeTrialStartedAt: true, freeMonthOfReleaseAt: true,
} as const;

type CoverFields = {
  subscriptionPlan: unknown;
  subscriptionStatus: string | null | undefined;
  careFeeStatus?: string | null;
  freeUntil?: Date | string | null;
  freePlan?: unknown;
  freeTrialStartedAt?: Date | string | null;
  freeMonthOfReleaseAt?: Date | string | null;
};

const DAY = 24 * 3600 * 1000;

export function whereTheTrialStands(
  org: CoverFields,
  grace: TheGrace | null | undefined,
  now: Date = new Date(),
): { stands: WhereTheTrialStands; trialEnded: Date | null; pausesAt: Date | null } {
  const none = { trialEnded: null, pausesAt: null };
  if (isSubscribed(org) || !!org.subscriptionStatus || org.careFeeStatus === 'ACTIVE') return { stands: 'a customer', ...none };
  const until = org.freeUntil ? new Date(org.freeUntil) : null;
  const aFreeMonth = !!until && !Number.isNaN(until.getTime()) && (!!org.freeTrialStartedAt || !!org.freeMonthOfReleaseAt);
  if (!aFreeMonth) return { stands: 'not on a trial', ...none };
  if (until!.getTime() > now.getTime()) return { stands: 'in its trial', ...none };
  if (!grace) return { stands: 'not on a trial', ...none };
  const from = Math.max(until!.getTime(), grace.notBefore ? grace.notBefore.getTime() : 0);
  const pausesAt = new Date(from + grace.weeks * 7 * DAY);
  return { stands: now.getTime() < pausesAt.getTime() ? 'after its trial' : 'paused', trialEnded: until, pausesAt };
}

export function isPaused(org: CoverFields, grace: TheGrace | null | undefined, now: Date = new Date()): boolean {
  return whereTheTrialStands(org, grace, now).stands === 'paused';
}

/**
 * `grace`, where it is given, is what the four weeks are: inside them the organisation is covered on its trial's plan until the day
 * it pauses, exactly as during the trial. A caller that has not read the grace setting sees the trial end on its own day.
 */
export function whatCoversThem<T extends CoverFields>(
  org: T,
  now: Date = new Date(),
  grace?: TheGrace | null,
): { covers: WhatCovers; plan: NonNullable<T['subscriptionPlan']> | null; until: Date | null; afterItsTrial?: true } {
  if (isSubscribed(org)) return { covers: 'paid', plan: org.subscriptionPlan as any, until: null };
  const until = org.freeUntil ? new Date(org.freeUntil) : null;
  if (until && until.getTime() > now.getTime() && org.freePlan) {
    return { covers: 'on the house', plan: org.freePlan as any, until };
  }
  const stands = grace ? whereTheTrialStands(org, grace, now) : null;
  if (stands?.stands === 'after its trial' && org.freePlan) {
    return { covers: 'on the house', plan: org.freePlan as any, until: stands.pausesAt, afterItsTrial: true };
  }
  return { covers: 'free tier', plan: null, until: null };
}

/** Whether anything at all covers them beyond the free tier. The read most gates want. */
export function isCovered<T extends Parameters<typeof whatCoversThem>[0]>(org: T, now?: Date, grace?: TheGrace | null): boolean {
  return whatCoversThem(org, now, grace).covers !== 'free tier';
}

/** The last day of a free run, from the day it is taken up. Whole months, so three means three. */
export function aFreeRunEndsOn(from: Date, months: number): Date {
  const end = new Date(from);
  end.setMonth(end.getMonth() + months);
  return end;
}
