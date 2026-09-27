/**
 * A DATE READS THE SAME EVERYWHERE.
 *
 * Every cron in the codebase pins UTC and the display layer pinned nothing: three date formats on
 * the report surfaces alone (en-US, en-GB, browser locale), a 14-day chart bucketed in the server's
 * own zone against UTC timestamps, and a `display.timezone` setting with a written rationale that
 * nothing read (fix plan B10). One formatter, one language, one clock. The client has a mirror of
 * this file; a guard fails any date formatted anywhere else.
 *
 * The purpose names what the reader is looking at, not how it is spelled, so a change of house
 * style is one line here and nowhere else.
 */
export type DatePurpose =
  /** 12 Sep 2026 */
  | 'day'
  /** 12 Sep */
  | 'dayAndMonth'
  /** 12 September */
  | 'dayAndMonthLong'
  /** 12 September 2026 */
  | 'full'
  /** Sep 2026 */
  | 'monthAndYear'
  /** 12 Sep, 14:05 */
  | 'dayAndTime'
  /** 14:05 */
  | 'time'
  /** Wednesday 23 September (Today's date line, C1) */
  | 'weekdayAndDay'
  /** Friday */
  | 'weekday'
  /** 4:00 pm */
  | 'hourOfDay'
  | 'shortWeekdayAndDay'
  /** Thu, Thursday's parts on the leave board (U.17) */
  | 'shortWeekday'
  /** 1 */
  | 'dayOfMonth'
  /** October */
  | 'month';

export const THE_LANGUAGE = 'en-GB';

const OPTIONS: Record<DatePurpose, Intl.DateTimeFormatOptions> = {
  day: { day: 'numeric', month: 'short', year: 'numeric' },
  dayAndMonth: { day: 'numeric', month: 'short' },
  dayAndMonthLong: { day: 'numeric', month: 'long' },
  full: { day: 'numeric', month: 'long', year: 'numeric' },
  monthAndYear: { month: 'short', year: 'numeric' },
  dayAndTime: { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
  time: { hour: '2-digit', minute: '2-digit' },
  weekdayAndDay: { weekday: 'long', day: 'numeric', month: 'long' },
  weekday: { weekday: 'long' },
  hourOfDay: { hour: 'numeric', minute: '2-digit', hour12: true },
  /* "Wed 23 Sept", a session's row on the list of every session (U.9, sessions.txt). */
  shortWeekdayAndDay: { weekday: 'short', day: 'numeric', month: 'short' },
  /* The parts of a stretch of days on the leave board (U.17, suite-leave.txt): "Thursday 1 and Friday
     2 October", "Thu 8 to Fri 9 Oct". */
  shortWeekday: { weekday: 'short' },
  dayOfMonth: { day: 'numeric' },
  month: { month: 'long' },
};

/**
 * The clock the product dates itself by. Set once at boot from the `display.timezone` ops setting
 * (see OpsSettingsService), and again whenever that setting changes. UTC until then, which is what
 * every stored timestamp already is.
 */
let theDisplayTimezone = 'UTC';

export function setDisplayTimezone(tz: string | null | undefined): void {
  if (!tz) return;
  try {
    new Intl.DateTimeFormat(THE_LANGUAGE, { timeZone: tz });
    theDisplayTimezone = tz;
  } catch {
    /* Not a zone this runtime knows; the last good one stands. */
  }
}

export function displayTimezone(): string {
  return theDisplayTimezone;
}

export function whenItWas(d: Date | string | number | null | undefined, purpose: DatePurpose, timeZone?: string): string {
  if (d === null || d === undefined || d === '') return '';
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(THE_LANGUAGE, { ...OPTIONS[purpose], timeZone: timeZone ?? theDisplayTimezone });
}
