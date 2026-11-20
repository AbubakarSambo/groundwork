/**
 * WHEN A CHECK-IN'S CLOCK STARTS, IN ONE PLACE.
 *
 * `Ground.startsAt` has existed since the create flow first collected it, and it gates when the
 * first check-in becomes available. It does not gate the timeline: the deadline, the days
 * remaining, and how far through the run a session believes it is were all computed from
 * `createdAt`, in three separate expressions.
 *
 * So a lead setting up a 90 day onboarding three weeks before the person starts had 90 days that
 * began the moment they pressed create. Three of those weeks ran against an empty check-in, the
 * sessions told everybody they were further through than they were, and the stall cron measured
 * lateness against a date nobody had agreed to.
 *
 * FALLING BACK TO `createdAt` IS THE OLD BEHAVIOUR EXACTLY, so a check-in with no start date
 * behaves as it always has and nothing needed backfilling.
 */
export interface HasAClock {
  createdAt: Date;
  startsAt?: Date | null;
  timelineDays?: number | null;
  /** Runs until the lead ends it (request 37): there is no deadline, so nothing can be out of time. */
  runsUntilEnded?: boolean | null;
  /** The end the lead chose, when there is one. It is the deadline (U.6 review). */
  endsAt?: Date | null;
}

export const clockStartsAt = (g: HasAClock): Date => g.startsAt ?? g.createdAt;

export function deadlineOf(g: HasAClock): Date | null {
  if (g.runsUntilEnded) return null;
  /* An end chosen as a day ("until 30 October") is kept as that day's midnight: it runs to the end of that day, not its first second (fix plan, pattern 4). */
  if (g.endsAt) { const e = new Date(g.endsAt); return e.getUTCHours() === 0 && e.getUTCMinutes() === 0 && e.getUTCSeconds() === 0 && e.getUTCMilliseconds() === 0 ? new Date(e.getTime() + 86_400_000 - 1) : e; }
  if (!g.timelineDays || g.timelineDays <= 0) return null;
  /* No start date AND no creation date is a row nobody has a clock for, and "1 January 1970 plus
     ninety days" is worse than saying nothing. It threw here the first time a caller passed a row
     selected without createdAt (22 September 2026). */
  const from = clockStartsAt(g);
  if (!from || Number.isNaN(from.getTime?.() ?? NaN)) return null;
  return new Date(from.getTime() + g.timelineDays * 86_400_000);
}

/**
 * THE LAST DAY OF THE CHECK-IN, AS A DAY PEOPLE READ: the one owner of the end date every page shows (batch 2, group 2; round 50: 26
 * October 2027 on the check-in page and 25 October on the board). An end the lead chose is that day. Otherwise it is the day the clock
 * runs out. `deadlineOf` stays the instant lateness is measured against: the chosen day's last millisecond in UTC, which read in Lagos
 * is already the next day, so it is never shown as the date.
 */
export function theLastDayOf(g: HasAClock): Date | null {
  if (g.runsUntilEnded) return null;
  return g.endsAt ? new Date(g.endsAt) : deadlineOf(g);
}

/**
 * Whole days left, never negative.
 *
 * FLOOR RATHER THAN ROUND, and it is the opposite call from the one in the suggestions lane. There,
 * rounding up stops somebody being told "0 days" on the last day something can be acted on. Here
 * the number is a promise about how long is left, and rounding a day and a half up to two days
 * means the product says two on the morning something is due tomorrow.
 */
export function daysRemaining(g: HasAClock, now: Date): number | null {
  const end = deadlineOf(g);
  if (!end) return null;
  return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 86_400_000));
}

/** True before the clock has started at all - a check-in set up for a date still to come. */
export const notStartedYet = (g: HasAClock, now: Date): boolean => clockStartsAt(g).getTime() > now.getTime();
