import { workingDaysOf } from '@/components/gw/when-the-check-ins-land'

/**
 * WHICH DAYS CHECK-INS OPEN ON, IN FULL SENTENCES (setup page review, 13 October).
 *
 * The reviewer read "Weekdays only. A check-in never opens at the weekend." and "Only Mon, Tue, Wed,
 * Thu, Fri, Sat. A check-in never opens on the other days." as clipped pieces. Said now as one
 * sentence, for any set of days: "Check-ins open on weekdays only, never at the weekend.",
 * "Check-ins open Monday to Saturday, never on a Sunday.", "Check-ins can open on any day, including
 * Saturday and Sunday." The same words build the rhythm ("every weekday, Monday to Friday") wherever
 * the product says how often a team checks in, so a check-in saved for weekdays never reads "Every day".
 */
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
/** The week as people here read it, from Monday. */
const WEEK = [1, 2, 3, 4, 5, 6, 0]

function inWeekOrder(days: number[]): number[] {
  return WEEK.filter((d) => days.includes(d))
}

function listed(days: number[], last: 'and' | 'or'): string {
  const names = inWeekOrder(days).map((d) => DAY_NAMES[d])
  return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} ${last} ${names[names.length - 1]}`
}

/** "Monday to Saturday" when the days run on without a gap (three or more), else null. */
function aRun(days: number[]): string | null {
  const ordered = inWeekOrder(days)
  if (ordered.length < 3) return null
  const at = ordered.map((d) => WEEK.indexOf(d))
  return at.every((p, i) => i === 0 || p === at[i - 1] + 1) ? `${DAY_NAMES[ordered[0]]} to ${DAY_NAMES[ordered[ordered.length - 1]]}` : null
}

const isWeekdays = (days: number[]) => days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))

/** The sentence under the day picker. */
export function theDaysInASentence(raw: number[] | null | undefined): string {
  const days = workingDaysOf(raw)
  if (!days.length) return 'Check-ins can open on any day, including Saturday and Sunday.'
  if (isWeekdays(days)) return 'Check-ins open on weekdays only, never at the weekend.'
  const closed = WEEK.filter((d) => !days.includes(d))
  const never = closed.length === 2 && closed.includes(6) && closed.includes(0)
    ? 'never at the weekend'
    : closed.length === 1 ? `never on a ${DAY_NAMES[closed[0]]}` : `never on ${listed(closed, 'or')}`
  const run = aRun(days)
  return `Check-ins open ${run ?? `on ${listed(days, 'and')}`}, ${never}.`
}

/** How often a daily rhythm really runs, given the days: "every day", "every weekday, Monday to Friday". */
export function everyDayThatTheyWork(raw: number[] | null | undefined): string {
  const days = workingDaysOf(raw)
  if (!days.length) return 'every day'
  if (isWeekdays(days)) return 'every weekday, Monday to Friday'
  const run = aRun(days)
  return run ? `every day from ${run}` : `every ${listed(days, 'and')}`
}
