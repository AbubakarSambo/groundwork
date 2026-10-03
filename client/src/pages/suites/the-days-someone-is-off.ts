import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * THE DAYS SOMEBODY IS OFF, IN THE LEAVE BOARD'S WORDS (U.17, suite-leave.txt). A day comes as
 * "2026-10-01", with no time of day, so it is read in UTC and never moves a day in anybody's zone.
 */
const at = (day: string) => new Date(`${day}T00:00:00.000Z`)
const say = (day: string, purpose: Parameters<typeof whenItWas>[1]) => whenItWas(at(day), purpose, 'UTC')
const DAY = 86_400_000

/** "Monday 5 October", "Thursday 1 and Friday 2 October", "Monday 5 to Friday 9 October". */
export function theDaysInFull(from: string, to: string): string {
  if (from === to) return say(from, 'weekdayAndDay')
  const joiner = at(to).getTime() - at(from).getTime() === DAY ? 'and' : 'to'
  const sameMonth = from.slice(0, 7) === to.slice(0, 7)
  const start = sameMonth ? `${say(from, 'weekday')} ${say(from, 'dayOfMonth')}` : say(from, 'weekdayAndDay')
  return `${start} ${joiner} ${say(to, 'weekdayAndDay')}`
}

/** "Mon 5 Oct", "Thu 8 to Fri 9 Oct". */
export function theDaysShort(from: string, to: string): string {
  if (from === to) return say(from, 'shortWeekdayAndDay')
  const sameMonth = from.slice(0, 7) === to.slice(0, 7)
  const start = sameMonth ? `${say(from, 'shortWeekday')} ${say(from, 'dayOfMonth')}` : say(from, 'shortWeekdayAndDay')
  return `${start} to ${say(to, 'shortWeekdayAndDay')}`
}
