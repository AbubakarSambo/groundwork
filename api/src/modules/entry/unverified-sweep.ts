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
    const [siblingUsers, orgGrounds] = await Promise.all([
      prisma.user.count({ where: { organizationId: user.organizationId, id: { not: user.id } } }),
      prisma.ground.count({ where: { organizationId: user.organizationId } }),
    ]);

    await prisma.user.delete({ where: { id: user.id } });
    result.usersDeleted += 1;

    if (siblingUsers === 0 && orgGrounds === 0) {
      await prisma.organization.delete({ where: { id: user.organizationId } });
      result.orgsDeleted += 1;
    }
  }

  return result;
}
