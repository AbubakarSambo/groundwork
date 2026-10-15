/**
 * A DATE READS THE SAME EVERYWHERE. The client mirror of api/src/common/a-date-reads-the-same-everywhere.ts:
 * one formatter, one language, and a guard that fails any date formatted anywhere else (fix plan
 * B10). The purpose names what the reader is looking at, so a change of house style is one line.
 *
 * The zone is the reader's own browser unless a surface sets one - the back office sets the
 * company's display timezone once it knows it, so a board dated there says the same day to
 * everybody who opens it.
 */
export type DatePurpose = 'day' | 'dayAndMonth' | 'dayAndMonthLong' | 'full' | 'monthAndYear' | 'dayAndTime' | 'time' | 'weekdayAndDay' | 'weekday' | 'hourOfDay' | 'shortWeekdayAndDay' | 'shortWeekday' | 'dayOfMonth' | 'month'

export const THE_LANGUAGE = 'en-GB'

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
}

let theDisplayTimezone: string | undefined

export function setDisplayTimezone(tz: string | null | undefined): void {
  if (!tz) return
  try {
    new Intl.DateTimeFormat(THE_LANGUAGE, { timeZone: tz })
    theDisplayTimezone = tz
  } catch {
    /* Not a zone this browser knows; the reader's own stands. */
  }
}

export function whenItWas(d: Date | string | number | null | undefined, purpose: DatePurpose, timeZone?: string): string {
  if (d === null || d === undefined || d === '') return ''
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(THE_LANGUAGE, { ...OPTIONS[purpose], timeZone: timeZone ?? theDisplayTimezone })
}

/**
 * THE LAST DAY OF SOMETHING, WITH ITS YEAR WHEN THE YEAR IS NOT THE ONE IT IS COUNTED FROM (journey
 * test, 12 October 2026). A check-in made on 11 October 2026 to run a year said "until 11 October" on
 * its invitation and in setup, which reads as the day it was made. The year is said only when it
 * differs, so "until 30 September" stays as the prototype has it.
 */
export function theLastDay(end: Date | string | number | null | undefined, from: Date | string | number = new Date(), timeZone?: string): string {
  if (end === null || end === undefined || end === '') return ''
  const e = end instanceof Date ? end : new Date(end)
  const f = from instanceof Date ? from : new Date(from)
  if (Number.isNaN(e.getTime())) return ''
  const year = (d: Date) => Number(d.toLocaleString(THE_LANGUAGE, { year: 'numeric', timeZone: timeZone ?? theDisplayTimezone }))
  return whenItWas(e, Number.isNaN(f.getTime()) || year(e) === year(f) ? 'dayAndMonthLong' : 'full', timeZone)
}
