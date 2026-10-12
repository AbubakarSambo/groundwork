import { Cadence } from '@prisma/client';
import { theDayIn } from './when-a-handoff-is-due';
import { workingDaysOf } from './which-days-this-team-works';
import { THE_PRODUCTS_OWN_ZONE, isAZone } from '../../common/the-organisations-own-day';

/**
 * EVERY NEXT SESSION OPENS ON THE CHECK-IN'S OWN SCHEDULE (decision 135, B-161).
 *
 * The next session used to open exactly 7 (or 14) days after the person FINISHED the last one, then
 * roll forward to the check-in's day. Brian answered a Monday check-in on Tuesday at 13:02; Tuesday plus
 * seven is a Tuesday, which rolled on to the Monday after, so his week 2 opened 13 days later and he lost
 * a week. Wairimu finished at 07:32, so her next one opened at 07:32 a week later, not at the start of
 * the day. The schedule belonged to each person's finishing minute instead of to the check-in.
 *
 * Now the check-in has one schedule, the same for the whole team: its rounds open on its own days, at the
 * start of that day in the organisation's time zone. Which day a person's next session opens is worked out
 * from the round their last session belonged to, never from when they finished it:
 *
 *   - the round of the session just finished is the latest round day on or before the day it opened
 *     (a session opened before the first round day counts as the first round);
 *   - the next session opens on the round day after that one;
 *   - when that day has already come (somebody answered a whole round late), they get the round that is
 *     running now, straight away, never a round already gone. So nobody loses a week, and nobody is handed
 *     two missed rounds in one week.
 *
 * THE ROUND DAYS. Round 0 is the day the check-in started (its start date, else the day it was made),
 * moved forward to a day the team works. Round 1 is one step of the rhythm later, moved forward to the
 * check-in's set day when it has one (the first such weekday for weekly and fortnightly, the set day of the
 * next month for monthly), and every round after is one more step. With no set day, the day comes from the
 * start itself, so a check-in that began on a Wednesday meets on Wednesdays. Each round day is moved forward
 * to a day the team works, as before.
 *
 * Sessions already made keep the day they were given; this rule only decides the day of the next one made.
 * Because the round of an old session is read from the day it opened, an old drifted day (07:32, or a week
 * pushed back) is read as the round it fell in, and the next one is the round after: never backwards, never
 * twice in the same round.
 *
 * DAILY, WEEKLY, FORTNIGHTLY and MONTHLY only. ONE_TIME has no next session and SEQUENTIAL opens when the
 * lead checks in; both are decided by the caller, as before.
 */

const DAY = 86_400_000;

export type TheSchedule = {
  cadence: Cadence;
  /** Weekly and fortnightly: 0 = Sunday .. 6 = Saturday. Monthly: the day of the month, 1 to 31. */
  anchorDay?: number | null;
  workingDays?: number[] | null;
  /** The check-in's start date, else the day it was made. */
  startedAt: Date;
  /**
   * The lead chose "Now" in setup: the check-in has no start date of its own (`Ground.startsAt` is
   * null). Then round 1 is the first set day at least half a cycle after the start (4 days for weekly,
   * 7 for fortnightly, half the start's month for monthly), so the first session stays open until then
   * and the team never gets two sessions a day apart. Daily is unchanged: the next day is a whole day on.
   */
  startsNow?: boolean;
  /** The organisation's own time zone. */
  zone?: string | null;
};

/** A calendar day as midnight UTC, so the weekday and the date never depend on the server's zone. */
type Day = number;

const theDay = (zone: string, at: Date): Day => theDayIn(zone, at).getTime();

function onADayTheyWork(day: Day, workingDays: number[] | null | undefined): Day {
  const days = workingDaysOf(workingDays);
  if (days.length === 0) return day;
  let d = day;
  for (let i = 0; i < 7 && !days.includes(new Date(d).getUTCDay() as any); i += 1) d += DAY;
  return d;
}

/** The instant a calendar day starts in a time zone (midnight there), counted through a change of clocks. */
export function theStartOfTheDayIn(zone: string, day: Day): Date {
  const offsetAt = (instant: number) => {
    const p = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(instant));
    const n = (t: string) => Number(p.find((x) => x.type === t)?.value);
    return Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second')) - instant;
  };
  let guess = day - offsetAt(day);
  guess = day - offsetAt(guess);
  return new Date(guess);
}

/** Round k's day, before it is moved to a day the team works. */
function roundDay(s: TheSchedule, start: Day, k: number): Day {
  if (k === 0) return start;
  const anchor = s.anchorDay;
  if (s.cadence === Cadence.MONTHLY) {
    const from = new Date(start);
    const y = from.getUTCFullYear();
    const m = from.getUTCMonth() + k;
    const wanted = anchor != null && anchor >= 1 && anchor <= 31 ? anchor : from.getUTCDate();
    const on = (month: number) => Date.UTC(y, month, Math.min(wanted, new Date(Date.UTC(y, month + 1, 0)).getUTCDate()));
    /* "Now" (Hafsah, 11 October 2026, changed the same evening from a full month to half): round 1 is
       the first set day at least half a month after the start, half being half the days of the start's
       own month, rounded down (15 for October). Set up on the 25th for "the 20th", it runs to 20
       November (26 days); set up on the 11th, 20 October is only 9 days away, so it runs to 20 November. */
    if (s.startsNow) {
      const half = Math.floor(new Date(Date.UTC(y, from.getUTCMonth() + 1, 0)).getUTCDate() / 2) * DAY;
      let j = 0;
      while (on(from.getUTCMonth() + j) - start < half) j += 1;
      return on(from.getUTCMonth() + j + k - 1);
    }
    /* Item 5: the set day still to come in the start's own month is round 1, so a start on the 11th
       for "the 20th" lands on the 20th of that month rather than skipping to the next one. */
    return on(from.getUTCMonth()) > start ? on(m - 1) : on(m);
  }
  if (s.cadence === Cadence.DAILY) return start + k * DAY;
  /* Item 5 (the walk, Sunday 11 October, "every Monday"): weekly, round 1 is the first set day after
     the start, Monday 12. It was the start plus a week, then the set day, Monday 19, so Monday 12 was
     skipped. Fortnightly keeps a fortnight before its set day.
     "Now" (Hafsah, 11 October 2026): the first session opens at once and stays open until the next set
     day at least half a cycle away: 4 days for weekly (half a week is three and a half), 7 for
     fortnightly. "Now" on Sunday 11 runs until Monday 19, never Monday 12; on Thursday 15 it runs until
     Monday 19 (4 days); on Saturday 17 until Monday 26. With no set day it stays a whole step. */
  const step = s.cadence === Cadence.FORTNIGHTLY ? 14 : 7;
  const anchored = anchor != null && anchor >= 0 && anchor <= 6;
  const firstGap = !anchored ? step : s.startsNow ? (s.cadence === Cadence.FORTNIGHTLY ? 7 : 4) : s.cadence === Cadence.WEEKLY ? 1 : step;
  let first = start + firstGap * DAY;
  if (anchor != null && anchor >= 0 && anchor <= 6) {
    while (new Date(first).getUTCDay() !== anchor) first += DAY;
  }
  return first + (k - 1) * step * DAY;
}

/**
 * HOW MANY ROUNDS FALL FROM THE START UP TO AND INCLUDING THE END (journey test, 12 October 2026).
 *
 * The setup screen, the saved count and the invitation said 12, then 65, then 261 for one check-in,
 * because the saved count walked its own dates (one step at a time from the start, no set day, no
 * "Now" rule) while setup listed the rounds this schedule really opens. Counting the rounds here, with
 * the same round days `whenTheNextSessionOpens` uses, makes the number saved the number the team gets.
 *
 * Both days are calendar days as midnight UTC. Rounds moved onto the same working day count once.
 */
export function howManyRoundsUpTo(s: Omit<TheSchedule, 'startedAt' | 'zone'>, startDay: number, endDay: number): number {
  const sched = s as TheSchedule;
  const start = onADayTheyWork(startDay, s.workingDays);
  let last: Day = -Infinity;
  let count = 0;
  for (let k = 0; k < 5000; k += 1) {
    const d = onADayTheyWork(roundDay(sched, start, k), s.workingDays);
    if (d > endDay) break;
    if (d > last) { count += 1; last = d; }
  }
  return count;
}

/**
 * The day the next session opens, as the instant that day starts in the organisation's zone.
 *
 * `lastOpenedAt` is when the session just finished became available (its `availableFrom`, else when it was
 * made). `now` is when it was finished.
 */
export function whenTheNextSessionOpens(s: TheSchedule, lastOpenedAt: Date, now: Date = new Date()): Date {
  const zone = isAZone(s.zone) ? s.zone : THE_PRODUCTS_OWN_ZONE;
  const start = onADayTheyWork(theDay(zone, s.startedAt), s.workingDays);
  const opened = theDay(zone, lastOpenedAt);
  const today = theDay(zone, now);

  /* The round the last session belonged to, and the round after it. */
  let roundOfLast: Day = start;
  let after: Day = today + DAY;
  for (let k = 0; k < 5000; k += 1) {
    const d = onADayTheyWork(roundDay(s, start, k), s.workingDays);
    if (d <= opened) roundOfLast = d;
    else if (d > roundOfLast) {
      after = d;
      break;
    }
  }
  /* A whole round late: the round running now, open straight away. Not that round's first day, which has
     gone, so reminders count from when it really opened for them. */
  if (after <= today) return now;
  return theStartOfTheDayIn(zone, after);
}
