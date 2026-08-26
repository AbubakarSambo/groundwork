import { PrismaService } from '../prisma/prisma.service';

/**
 * How old an unverified account has to be before it is swept. Long enough that
 * nobody loses a link they were slow to open - a magic link only lasts 24
 * hours, so anything past a month is not coming back.
 */
export const UNVERIFIED_MAX_AGE_DAYS = 30;

export interface SweepResult {
  usersDeleted: number;
  orgsDeleted: number;
  skippedNotEmpty: number;
}

/**
 * Sweep accounts that were created by asking for a sign-in link and never
 * confirmed.
 *
 * Asking for a link with an unknown address creates the user AND an
 * organisation immediately, before anything is clicked - deliberately, because
 * an anonymous draft needs somewhere to live. The cost is that a mistyped or
 * idly-entered address leaves a stranger's email and an empty org behind
 * forever.
 *
 * THE RULE THIS HOLDS TO: only ever delete an account that is provably empty.
 * Unverified is not enough on its own - somebody could be invited to a ground,
 * contribute, and still not have clicked their own activation link, and their
 * record must survive that. So every relation that could hold work is checked
 * first, and anything with a trace of a person in it is left alone and counted.
 *
 * Pure function of the prisma client so it can be tested without a scheduler.
 */
export async function sweepUnverifiedAccounts(
  prisma: PrismaService,
  now: Date,
  maxAgeDays: number = UNVERIFIED_MAX_AGE_DAYS,
): Promise<SweepResult> {
  const cutoff = new Date(now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000);

  const candidates = await prisma.user.findMany({
    where: { isEmailVerified: false, createdAt: { lt: cutoff }, deletedAt: null },
    select: {
      id: true,
      organizationId: true,
      _count: {
        select: {
          groundsInitiated: true,
          participantLinks: true,
          contributorCodes: true,
          redeemedCodes: true,
          codeRedemptions: true,
          styleProfiles: true,
        },
      },
    },
  });

  const result: SweepResult = { usersDeleted: 0, orgsDeleted: 0, skippedNotEmpty: 0 };

  for (const user of candidates) {
    const hasAnything = Object.values(user._count).some((n) => n > 0);
    if (hasAnything) {
      result.skippedNotEmpty += 1;
      continue;
    }

    // The org goes too, but only if this person was its only member and it
    // never held a ground. A shared org that happens to contain one stale
    // invite is somebody else's live workspace.
    /**
     * WRAPPED, BECAUSE THIS IS THE ONLY IRREVERSIBLE PATH IN THE CODEBASE.
     *
     * If any of these reads throws - a dropped connection, a timeout mid-sweep - the safe answer is
     * "do not delete", not "carry on with what we managed to fetch". An unhandled rejection here
     * would abort the whole nightly run, which is survivable; silently deleting an org because the
     * billing count failed is not.
     */
    let siblingUsers = 1, orgGrounds = 1, orgBillingEvents = 1;
    let org: { stripeCustomerId: string | null; subscriptionStatus: string | null; subscriptionStripeId: string | null; careFeeSubscriptionId: string | null } | null = null;
    let orgChecksSucceeded = false;
    try {
      [siblingUsers, orgGrounds, orgBillingEvents, org] = await Promise.all([
        prisma.user.count({ where: { organizationId: user.organizationId, id: { not: user.id } } }),
        prisma.ground.count({ where: { organizationId: user.organizationId } }),
      /**
       * AND HAS THIS ORGANISATION EVER BEEN CHARGED, which this never asked.
       *
       * The predicate above checks six traces of a person and then the ground count, and consulted
       * nothing financial. `BillingEvent.organization` is `onDelete: Cascade`, so deleting the org
       * takes its whole charge ledger with it, and a locally held Stripe customer id is orphaned
       * rather than cancelled. This is the only path in the codebase that destroys data
       * irreversibly, and the one class of data it ignored is the one that cannot be rebuilt.
       *
       * The old safety argument was "a subscriber would have to be verified". That is an assumption
       * the code does not enforce - signup provisions an ADMIN before email verification - so it is
       * now checked rather than assumed.
       */
      prisma.billingEvent.count({ where: { organizationId: user.organizationId } }),
      prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: {
          stripeCustomerId: true,
          subscriptionStatus: true,
          subscriptionStripeId: true,
          careFeeSubscriptionId: true,
        },
      }),
      ]);
      orgChecksSucceeded = true;
    } catch (err) {
      /** Left as-is: the initialised values above are all non-zero, so nothing is deleted. */
      orgChecksSucceeded = false;
    }

    /**
     * Any financial trace at all disqualifies, including a CANCELLED subscription: the record of what
     * somebody was once charged is exactly what you need when they query a charge months later.
     */
    const hasMoneyTrace =
      orgBillingEvents > 0 ||
      !!org?.stripeCustomerId ||
      !!org?.subscriptionStatus ||
      !!org?.subscriptionStripeId ||
      !!org?.careFeeSubscriptionId;

    await prisma.user.delete({ where: { id: user.id } });
    result.usersDeleted += 1;

    if (orgChecksSucceeded && siblingUsers === 0 && orgGrounds === 0 && !hasMoneyTrace) {
      await prisma.organization.delete({ where: { id: user.organizationId } });
      result.orgsDeleted += 1;
    }
  }

  return result;
}
