/**
 * WHICH DAYS THIS TEAM WORKS, AND WHAT THAT DOES TO A DATE.
 *
 * A daily cadence was `+1 day`, flat. It landed on Saturday and it landed on Sunday, and a check-in
 * that opens on a day nobody is working is a check-in nobody does - which then reads on the board
 * as somebody who did not answer.
 *
 * MONDAY TO FRIDAY IS NOT A FACT ABOUT THE WORLD. Field teams work Saturdays. The week starts on
 * Sunday across much of the region this is built for. So this is never inferred and never defaulted
 * to weekdays: an empty list means nobody said, the date is left exactly where the cadence put it,
 * and the form says so rather than quietly assuming a Western office week.
 *
 * IT APPLIES TO EVERY CADENCE, NOT ONLY DAILY. A fortnightly ground whose anchor lands on a day the
 * team does not work has the same problem in a smaller way, and fixing only the loud case is how it
 * comes back.
 */

/**
 * ONE CALENDAR FOR EVERY CHECK-IN, SET AT SETUP (Hafsah, 15 and 29 October 2026). The lead's days, Monday to Friday unless she says
 * otherwise, for every rhythm, daily, weekly or monthly. This reverses the "never defaulted to weekdays" rule above: a weekly check-in
 * saved with no days was due on a Sunday ("due tomorrow, Sunday 31 January"), and each reader made up its own meaning for "no days".
 * Days she gave are kept as she gave them; every day listed means every day.
 */
export function theDaysItRunsOn(_cadence: string | null | undefined, said: number[] | null | undefined): number[] {
  return workingDaysOf(said);
}

/** 0 = Sunday .. 6 = Saturday, the same numbering as `Date.getDay` and `cadenceAnchorDay`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const MONDAY_TO_FRIDAY: Weekday[] = [1, 2, 3, 4, 5];

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * THE DAYS A CHECK-IN WORKS, NEVER NONE. A list with junk in it is filtered rather than rejected (an out-of-range number from an old
 * client must not make a check-in unschedulable); a list with nothing in it is Monday to Friday, the one default every reader shares.
 */
export function workingDaysOf(raw: number[] | null | undefined): Weekday[] {
  const days = [...new Set((raw ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))] as Weekday[];
  return days.length ? days.sort((a, b) => a - b) : [...MONDAY_TO_FRIDAY];
}

/** The day of the week a moment falls on where the check-in is (its organisation's zone), or on this server's clock with none. */
export function theWeekdayIn(date: Date, zone?: string | null): Weekday {
  if (!zone) return date.getDay() as Weekday;
  const name = new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: zone }).format(date);
  return DAY_NAMES.indexOf(name) as Weekday;
}

/** Whether this moment falls on a day the check-in works. */
export function isAWorkingDay(date: Date, raw: number[] | null | undefined, zone?: string | null): boolean {
  return workingDaysOf(raw).includes(theWeekdayIn(date, zone));
}

/**
 * Move a date forward to the next day this team works. Returns the same date when it is already a working day.
 *
 * FORWARD, NEVER BACK. Rolling a Saturday check-in back to Friday would move it into a week the
 * team has already reported on, and would quietly pull a deadline earlier than the one somebody
 * agreed to. Later is a delay; earlier is a different promise.
 */
export function theNextDayTheyWork(date: Date, raw: number[] | null | undefined): Date {
  const days = workingDaysOf(raw);
  const d = new Date(date);
  // At most seven steps: a non-empty list always contains a day of the week.
  for (let i = 0; i < 7 && !days.includes(d.getDay() as Weekday); i += 1) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/**
 * WHAT TO SAY ABOUT IT, IN THE WORDS SOMEBODY CHOSE.
 *
 * Not "working days configured". The reader wants to know which days their check-in can land on.
 */
export function sayWhichDays(raw: number[] | null | undefined): string | null {
  const days = workingDaysOf(raw);
  if (days.length === 7) return null;
  if (days.length === 5 && MONDAY_TO_FRIDAY.every((d) => days.includes(d))) {
    return 'Weekdays only. A check-in never opens on a Saturday or a Sunday.';
  }
  const names = days.map((d) => DAY_NAMES[d]);
  const last = names.pop();
  return names.length
    ? `Check-ins only open on ${names.join(', ')} or ${last}.`
    : `Check-ins only open on a ${last}.`;
}

/**
 * HOW OFTEN A DAILY RHYTHM REALLY RUNS, GIVEN THE DAYS (setup page review, 13 October). A check-in
 * saved for weekdays only was said back as "every day". The same words as the screens
 * (client/src/lib/the-days-in-words.ts): "every day", "every weekday, Monday to Friday", "every day
 * from Monday to Saturday", "every Monday, Wednesday and Friday".
 */
const WEEK_FROM_MONDAY: Weekday[] = [1, 2, 3, 4, 5, 6, 0];
export function everyDayThatTheyWork(raw: number[] | null | undefined): string {
  const days = workingDaysOf(raw);
  if (days.length === 7) return 'every day';
  if (days.length === 5 && MONDAY_TO_FRIDAY.every((d) => days.includes(d))) return 'every weekday, Monday to Friday';
  const ordered = WEEK_FROM_MONDAY.filter((d) => days.includes(d));
  const at = ordered.map((d) => WEEK_FROM_MONDAY.indexOf(d));
  if (ordered.length >= 3 && at.every((p, i) => i === 0 || p === at[i - 1] + 1)) {
    return `every day from ${DAY_NAMES[ordered[0]]} to ${DAY_NAMES[ordered[ordered.length - 1]]}`;
  }
  const names = ordered.map((d) => DAY_NAMES[d]);
  return `every ${names.length <= 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`}`;
}
