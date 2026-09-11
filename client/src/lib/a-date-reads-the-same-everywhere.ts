/**
 * A DATE READS THE SAME EVERYWHERE. The client mirror of api/src/common/a-date-reads-the-same-everywhere.ts:
 * one formatter, one language, and a guard that fails any date formatted anywhere else (fix plan
 * B10). The purpose names what the reader is looking at, so a change of house style is one line.
 *
 * The zone is the reader's own browser unless a surface sets one - the back office sets the
 * company's display timezone once it knows it, so a board dated there says the same day to
 * everybody who opens it.
 */
export type DatePurpose = 'day' | 'dayAndMonth' | 'dayAndMonthLong' | 'full' | 'monthAndYear' | 'dayAndTime' | 'time'

export const THE_LANGUAGE = 'en-GB'

const OPTIONS: Record<DatePurpose, Intl.DateTimeFormatOptions> = {
  day: { day: 'numeric', month: 'short', year: 'numeric' },
  dayAndMonth: { day: 'numeric', month: 'short' },
  dayAndMonthLong: { day: 'numeric', month: 'long' },
  full: { day: 'numeric', month: 'long', year: 'numeric' },
  monthAndYear: { month: 'short', year: 'numeric' },
  dayAndTime: { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
  time: { hour: '2-digit', minute: '2-digit' },
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
