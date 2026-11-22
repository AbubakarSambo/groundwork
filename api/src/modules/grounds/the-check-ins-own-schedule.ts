import { isAPublicHoliday } from './public-holidays';
import { Cadence } from '@prisma/client';
import { theDayIn } from './when-a-handoff-is-due';
import { workingDaysOf, everyDayThatTheyWork } from './which-days-this-team-works';
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
  /** Weekly, twice or more a week: the weekdays it meets on, 0 = Sunday .. 6 = Saturday (Ground.cadenceDays). */
  days?: number[] | null;
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

/* A day they work: one of the team's working days, and not a public holiday where the organisation is (public-holidays.ts), when the zone is known. */
function onADayTheyWork(day: Day, workingDays: number[] | null | undefined, zone?: string | null): Day {
  const days = workingDaysOf(workingDays);
  const off = (d: Day) => (days.length > 0 && !days.includes(new Date(d).getUTCDay() as any)) || (zone !== undefined && isAPublicHoliday(d, zone));
  let d = day;
  for (let i = 0; i < 14 && off(d); i += 1) d += DAY;
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
  /* TWICE OR MORE A WEEK (2 November 2026): round k is the k-th chosen weekday after the start, so "Monday and Thursday" from a
     Sunday start meets Monday, Thursday, Monday, and so on. */
  const chosen = theWeekdaysItMeets(s);
  if (chosen.length >= 2) {
    let d = start;
    for (let i = 0; i < k; ) { d += DAY; if (chosen.includes(new Date(d).getUTCDay())) i += 1; }
    return d;
  }
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

/** The weekdays a weekly check-in meets on when it meets on more than one, sorted; empty otherwise. */
export function theWeekdaysItMeets(s: { cadence?: Cadence | string | null; days?: number[] | null }): number[] {
  if (s.cadence !== Cadence.WEEKLY) return [];
  const days = [...new Set((s.days ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b);
  return days.length >= 2 ? days : [];
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMES = ['', 'once', 'twice', 'three times', 'four times', 'five times', 'six times', 'seven times'];

/**
 * HOW OFTEN, IN WORDS, WHEN IT MEETS MORE THAN ONCE A WEEK: "twice a week, on Monday and Thursday", the one wording every sentence on
 * the server uses (the check-in's own line, what it asks). Null when it meets once a week or less.
 */
export function timesAWeekInWords(s: { cadence?: Cadence | string | null; days?: number[] | null }): string | null {
  const days = theWeekdaysItMeets(s);
  if (!days.length) return null;
  const names = days.map((d) => WEEKDAY_NAMES[d]);
  const listed = names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `${TIMES[days.length]} a week, on ${listed}`;
}

/**
 * WHAT ONE ROUND COVERS, WORDED ONCE: 'day', 'week', 'fortnight' or 'month' where the check-in repeats once or less a day... and null for one that
 * meets more than once a week, runs one time or has no fixed schedule. A number a person gives in a round is their count for this period, so it is
 * never the same thing counted again in the next round. The one owner: the model's context (thePeriodOfARound) and the comparison of what a person
 * said in two rounds (whatDoesNotAddUp) both read it here.
 */
export function theUnitOfARound(s: { cadence?: Cadence | string | null; days?: number[] | null }): 'day' | 'week' | 'fortnight' | 'month' | null {
  if (timesAWeekInWords(s)) return null;
  return s.cadence === 'DAILY' ? 'day' : s.cadence === 'WEEKLY' ? 'week' : s.cadence === 'FORTNIGHTLY' ? 'fortnight' : s.cadence === 'MONTHLY' ? 'month' : null;
}

const ordinal = (n: number) => (n % 10 === 1 && n !== 11 ? `${n}st` : n % 10 === 2 && n !== 12 ? `${n}nd` : n % 10 === 3 && n !== 13 ? `${n}rd` : `${n}th`);

/**
 * HOW OFTEN A CHECK-IN RUNS, WORDED ONCE (staging check S18, 4 November 2026). The same check-in read "Every day", "Every weekday,
 * Monday to Friday" and "Daily on weekdays" on three pages, because three functions worded it. This is the one wording on the server,
 * as part of a sentence: "every weekday, Monday to Friday", "every day", "twice a week, on Monday and Thursday", "every Thursday",
 * "every other Thursday", "on the 5th of each month", "once". The invitation, People and setup, the assistant and the context chat all
 * read it, and the screens' own `howOftenTheTeamChecksIn` (client/src/lib/the-closing-after-your-first-check-in.ts) says the same words.
 * A daily check-in with no days saved runs Monday to Friday, as the scheduler runs it (workingDaysOf), so it is never said as "every day".
 */
export function howOftenItRuns(g: { cadence?: Cadence | string | null; workingDays?: number[] | null; cadenceAnchorDay?: number | null; cadenceDays?: number[] | null }): string {
  const anchor = g.cadenceAnchorDay;
  const aWeekday = anchor != null && anchor >= 0 && anchor <= 6 ? WEEKDAY_NAMES[anchor] : null;
  switch (g.cadence) {
    case 'DAILY':
      return everyDayThatTheyWork(g.workingDays);
    case 'WEEKLY':
      return timesAWeekInWords({ cadence: g.cadence, days: g.cadenceDays }) ?? (aWeekday ? `every ${aWeekday}` : 'every week');
    case 'FORTNIGHTLY':
      return aWeekday ? `every other ${aWeekday}` : 'every two weeks';
    case 'MONTHLY':
      return anchor != null && anchor >= 1 && anchor <= 31 ? `on the ${ordinal(anchor)} of each month` : 'once a month';
    case 'SEQUENTIAL':
      return 'each time a new round is opened';
    case 'ONE_TIME':
      return 'once';
    default:
      return 'when it opens';
  }
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
  return theRoundDaysUpTo(s, startDay, endDay).length;
}

/**
 * THE ROUND DAYS THEMSELVES, FROM THE START UP TO AND INCLUDING THE END (setup, 23 November 2026). The setup screen used to walk its
 * own dates and said 29 where the saved check-in held 25. It now shows these days, the same ones the count above is made of, so the
 * dates set up and the dates saved are one list. `most` stops an open-ended list early.
 */
export function theRoundDaysUpTo(s: Omit<TheSchedule, 'startedAt' | 'zone'>, startDay: number, endDay: number, most = 5000): Day[] {
  const sched = s as TheSchedule;
  const zone = (s as TheSchedule).zone;
  const start = onADayTheyWork(startDay, s.workingDays, zone);
  const days: Day[] = [];
  for (let k = 0; k < 5000 && days.length < most; k += 1) {
    const d = onADayTheyWork(roundDay(sched, start, k), s.workingDays, zone);
    if (d > endDay) break;
    if (!days.length || d > days[days.length - 1]) days.push(d);
  }
  return days;
}

/**
 * The day the next session opens, as the instant that day starts in the organisation's zone.
 *
 * `lastOpenedAt` is when the session just finished became available (its `availableFrom`, else when it was
 * made). `now` is when it was finished.
 */
export function whenTheNextSessionOpens(s: TheSchedule, lastOpenedAt: Date, now: Date = new Date()): Date {
  const zone = isAZone(s.zone) ? s.zone : THE_PRODUCTS_OWN_ZONE;
  const today = theDay(zone, now);
  const after = theRoundAfter(s, zone, lastOpenedAt) ?? today + DAY;
  /* A whole round late: the round running now, open straight away. Not that round's first day, which has
     gone, so reminders count from when it really opened for them. */
  if (after <= today) return now;
  return theHourItOpens(s, zone, after);
}

/**
 * A CHECK-IN OPENS AT 8 IN THE MORNING, IN THE ORGANISATION'S OWN ZONE (Hafsah, 13 October 2026, evening, for daily; every rhythm since the
 * channel test of 20 November 2026, W27). A daily one opened at midnight, so every person on WhatsApp was written to at 11pm ("opens in an
 * hour") and again after midnight ("is open"). A weekly one still opened at midnight, so Chidi's check-in said "opens on Friday 27 November at
 * 12am". Every rhythm now opens at 8 where the team is. A check-in already running changes from its next session: the one open now closes
 * when the next one opens, at 8, so there are never two at once.
 */
export const A_CHECK_IN_OPENS_AT_HOUR = 8;
/** The hour of the day a check-in opens: 8 for every rhythm that has a next session; null for one that opens when it is made or when the lead checks in. */
export const theHourACheckInOpens = (cadence: string): number | null => (cadence === Cadence.ONE_TIME || cadence === Cadence.SEQUENTIAL ? null : A_CHECK_IN_OPENS_AT_HOUR);
function theHourItOpens(_s: Pick<TheSchedule, 'cadence'>, zone: string, day: Day): Date {
  return theStartOfTheDayIn(zone, day + A_CHECK_IN_OPENS_AT_HOUR * 3_600_000);
}

/** The day the round after the one a session opened in begins, or null when the schedule has none. */
function theRoundAfter(s: TheSchedule, zone: string, lastOpenedAt: Date): Day | null {
  const start = onADayTheyWork(theDay(zone, s.startedAt), s.workingDays, zone);
  const opened = theDay(zone, lastOpenedAt);
  /* The round the last session belonged to, and the round after it. */
  let roundOfLast: Day = start;
  for (let k = 0; k < 5000; k += 1) {
    const d = onADayTheyWork(roundDay(s, start, k), s.workingDays, zone);
    if (d <= opened) roundOfLast = d;
    else if (d > roundOfLast) return d;
  }
  return null;
}

/**
 * WHEN THE ROUND A SESSION OPENED IN CLOSES (journey test, round 3, 12 October 2026): the instant the next
 * round begins, at the start of that day in the organisation's zone. A session nobody opened is closed by
 * the clock then, as missed. Null when the schedule has no next round.
 */
export function whenTheRoundCloses(s: TheSchedule, openedAt: Date): Date | null {
  const zone = isAZone(s.zone) ? s.zone : THE_PRODUCTS_OWN_ZONE;
  const after = theRoundAfter(s, zone, openedAt);
  return after == null ? null : theHourItOpens(s, zone, after);
}
