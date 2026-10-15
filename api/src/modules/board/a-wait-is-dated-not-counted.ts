import { theDayInWords } from './the-day-in-words';

/**
 * A WAIT IS SAID WITH THE DAY IT BEGAN, NEVER WITH A COUNT OF DAYS FROM THE MOMENT OF READING (screens request
 * 117, part 9; CLAUDE.md and decision 7: reports and boards change only when something new comes in).
 *
 * The sales board read "Amani Wekesa has been waiting 4 days on you for the price list." at 20:46 and "5 days"
 * at 20:51, with nothing new on the record, and the coaching said 5 where the row said 4. A count of days from
 * the reading changes every time the page is opened, and two parts read at two moments disagree. So a wait is
 * said with its day: "Amani Wekesa has been waiting on you for the price list since 28 September." The same
 * record reads the same at any hour.
 *
 * Where something still has to be decided by how long a thing has sat (a fortnight unchased, for example), it
 * is measured to the record's own clock: the newest thing the record holds, never the reader's clock. So the
 * board changes on that only when something new comes in.
 */
export const A_DAY_MS = 86_400_000;

const asTime = (d: Date | string | number | null | undefined): number | null => {
  if (d === null || d === undefined) return null;
  const t = new Date(d as any).getTime();
  return Number.isFinite(t) ? t : null;
};

/** The record's own clock: the newest of these times, or `fallback` where there is none. */
export function theRecordsClock(times: Iterable<Date | string | number | null | undefined>, fallback: Date): Date {
  let newest: number | null = null;
  for (const t of times) {
    const ms = asTime(t);
    if (ms !== null && (newest === null || ms > newest)) newest = ms;
  }
  return newest === null ? fallback : new Date(newest);
}

/** Whole days from `from` to the record's clock, never below nought. */
export function wholeDaysTo(from: Date | string | number | null | undefined, clock: Date): number {
  const ms = asTime(from);
  return ms === null ? 0 : Math.max(0, Math.floor((clock.getTime() - ms) / A_DAY_MS));
}

/** "28 September", in Lagos time like every board date, with the year only where it is not the record's year. */
export function theDayItBegan(from: Date | string | number, clock: Date): string {
  return theDayInWords(new Date(from as any), clock);
}
