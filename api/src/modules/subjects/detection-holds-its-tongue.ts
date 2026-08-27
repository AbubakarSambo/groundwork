/**
 * WHY A NEW DEPLOYMENT SHOULD SAY NOTHING FOR A WHILE.
 *
 * A first sync of several thousand objectives trips every detector at once. Nothing has been
 * discussed yet, so every finding is about silence - nobody has mentioned this objective, nobody
 * has checked in, this has no owner - and all of it is true and none of it is useful. Day one looks
 * like a wall of accusations about work the customer has not started talking about, and they
 * reasonably conclude the tool is broken.
 *
 * Findings should begin when there is conversational data to ground them, not on import alone.
 *
 * STAMPED AT IMPORT TIME. No detector exists yet to be suppressed, and that is exactly why this is
 * recorded now rather than computed when they arrive: the import that should have started the
 * window will by then have happened months ago and left nothing behind to measure from.
 */

/** Days of silence after a qualifying import. */
export const QUIET_DAYS = 14;

/**
 * An import this size or larger starts a window even when it is not the org's first.
 *
 * A customer connecting a second system, or re-syncing after a reorganisation, produces the same
 * wall of untouched subjects as a first sync. The number is a judgement rather than a measurement -
 * small enough that a real bulk load crosses it, large enough that routine pushes do not, since a
 * window that restarts on every ordinary sync is a product that never says anything at all.
 */
export const BULK_THRESHOLD = 50;

export type QuietReason = 'INITIAL_IMPORT' | 'BULK_IMPORT';

/**
 * Whether this import earns a quiet period, and why.
 *
 * `isFirstImport` rather than a count of existing subjects: an org whose first import failed
 * halfway has subjects and has still not had its quiet period, and counting rows would decide it
 * had.
 */
export function quietPeriodFor(
  opts: { subjectCount: number; isFirstImport: boolean },
  now: Date,
  quietDays: number = QUIET_DAYS,
): { reason: QuietReason; endsAt: Date } | null {
  const { subjectCount, isFirstImport } = opts;
  /* An import of nothing is not an event. */
  if (subjectCount <= 0) return null;

  if (isFirstImport) {
    return { reason: 'INITIAL_IMPORT', endsAt: addDays(now, quietDays) };
  }
  if (subjectCount >= BULK_THRESHOLD) {
    return { reason: 'BULK_IMPORT', endsAt: addDays(now, quietDays) };
  }
  return null;
}

/**
 * THE READ SIDE, for whatever eventually asks. Deliberately a pure function over rows the caller
 * fetched, so a detector consults it without this module knowing what a detector is.
 *
 * The LATEST end wins rather than the first. Two overlapping imports should extend the silence, not
 * end it early on the older one's clock - otherwise a customer who loads their objectives and then
 * their projects an hour later gets findings about the projects almost immediately.
 */
export function quietUntil(periods: { endsAt: Date }[], now: Date): Date | null {
  const future = periods.map((p) => p.endsAt).filter((d) => d > now);
  if (!future.length) return null;
  return future.reduce((a, b) => (a > b ? a : b));
}

export function isQuiet(periods: { endsAt: Date }[], now: Date): boolean {
  return quietUntil(periods, now) !== null;
}

function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 86_400_000);
}
