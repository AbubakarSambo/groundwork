/**
 * WHEN THE WORDING WE HOLD STOPS BEING WORTH REPEATING.
 *
 * A subject is a pointer: the address, the wording as of the last sync, and when we last looked.
 * The wording is the part that rots. An assistant answering confidently about "reduce onboarding to
 * under 14 days" three weeks after the customer changed it to 10 destroys trust faster than any
 * wrong answer, because it is wrong in a way that sounds authoritative and cites their own system.
 *
 * So staleness is a property of the row, computed at read, never stored. Storing it would need a
 * job to keep it true and would be wrong for exactly as long as that job was late - which is the
 * same two-places-must-agree failure the pointer design exists to avoid.
 *
 * Pure and separate from the service so the boundary can be tested as arithmetic rather than
 * through a database.
 */

/** Days after which held wording is presented as stale rather than as current. */
export const STALENESS_DAYS = 14;

const DAY_MS = 86_400_000;

export type Freshness = 'fresh' | 'stale' | 'disconnected';

/**
 * DISCONNECTED IS NOT AN OLDER KIND OF STALE.
 *
 * A source system that stopped pushing three weeks ago and one whose subject was deleted are
 * different facts and lead to different actions - chase the integration, versus stop asking about
 * work that no longer exists. Collapsing them into "old" is how a customer discovers their OKR tool
 * has been silent for a month by noticing the answers have gone odd.
 */
export function freshnessOf(
  subject: { syncedAt: Date; sourceDeletedAt?: Date | null },
  now: Date,
  stalenessDays: number = STALENESS_DAYS,
): Freshness {
  if (subject.sourceDeletedAt) return 'disconnected';
  const age = now.getTime() - subject.syncedAt.getTime();
  /*
   * `>` rather than `>=`: a subject synced exactly `stalenessDays` ago is on the boundary, and the
   * boundary belongs to fresh. A window that expires the instant it is reached would report a
   * fortnightly push as stale every single time it ran on schedule.
   */
  return age > stalenessDays * DAY_MS ? 'stale' : 'fresh';
}

/**
 * A CLOCK SKEW MUST NOT READ AS FRESHER THAN NOW.
 *
 * A `syncedAt` in the future - a customer's server running fast, or a payload carrying its own
 * timestamp - produces a negative age, which is not stale under any window. That is the correct
 * answer and worth naming: being early is not a reason to distrust the wording. It is here so the
 * next reader does not "fix" it into an absolute value and turn a fast clock into a stale record.
 */
export function ageInDays(subject: { syncedAt: Date }, now: Date): number {
  return (now.getTime() - subject.syncedAt.getTime()) / DAY_MS;
}
