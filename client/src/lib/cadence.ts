import type { GroundCadence } from '@/api/grounds'

/**
 * How often people check in, named ONE way.
 *
 * The two places a ground could be created disagreed: one offered "Fortnightly"
 * and the other "Every 2 weeks" for the same value. Small, but it is the kind of
 * thing that makes an admin wonder whether the two screens are even setting the
 * same field - and on the screen where they are deciding how often to ask four
 * people to account for themselves, that doubt is not free.
 *
 * `days` is the interval, used to work out how many sessions a timeframe holds.
 * SEQUENTIAL has no interval: it fires when the lead checks in, so the number of
 * sessions is not a function of elapsed time.
 */
export interface CadenceOption {
  cadence: GroundCadence
  label: string
  /** Days between sessions, or null when the cadence is not time-based. */
  days: number | null
}

/* U.6 review: ONE SET OF NAMES FOR HOW OFTEN, the prototype's (setup.txt), used by the setup before
   saving and by the check-in's own Setup alike. They were "Daily", "Weekly" and so on here and
   "Every day", "Every week" on the setup. "When I choose" is read by the lead, who runs it. */
export const CADENCES: CadenceOption[] = [
  { cadence: 'DAILY', label: 'Every day', days: 1 },
  { cadence: 'WEEKLY', label: 'Every week', days: 7 },
  { cadence: 'FORTNIGHTLY', label: 'Every 2 weeks', days: 14 },
  { cadence: 'MONTHLY', label: 'Every month', days: 30 },
  { cadence: 'SEQUENTIAL', label: 'When I choose', days: null },
  /**
   * A single round, and no follow-up is ever scheduled.
   *
   * It is in this list so `cadenceLabel` can name it, and it IS offered in the dropdown - see
   * SELECTABLE_CADENCES below. Keeping it out was the original call, on the grounds that a one-off has
   * no rhythm to choose. That was wrong once a situation recommended it: the control could not display
   * its own recommendation, and the screen showed "Daily" for a ground the product had set to one round.
   */
  { cadence: 'ONE_TIME', label: 'Once', days: null },
]

/** The cadences offered when someone is choosing a regular rhythm. */
export const TIMED_CADENCES = CADENCES.filter((c) => c.days !== null)

/**
 * EVERY RHYTHM A LEAD MAY CHOOSE, WHICH IS NOT THE SAME AS EVERY TIME-BASED ONE.
 *
 * The cadence dropdown offered `TIMED_CADENCES` - the four with a fixed interval - so two rhythms the
 * product fully supports were unreachable from the only screen that sets one: "when the lead checks
 * in", which fires on the lead's own check-in rather than on elapsed time, and "one time", which is the
 * whole design of the one-off read.
 *
 * That turned into a visible defect the moment a situation RECOMMENDED one of them. Picking the one-off
 * read seeded ONE_TIME into a select with no such option, so the screen showed "Daily" while the state
 * held ONE_TIME, the timeframe showed "1 week" while the state held one day, and the summary underneath
 * read "1 sessions over 1 days". Three different answers on one screen.
 *
 * The recommendation and the control were two lists with nothing reconciling them, which is the same
 * shape as the label drift and the pricing drift. `every-recommendation-is-selectable.spec.ts` is what
 * stops it coming back.
 */
export const SELECTABLE_CADENCES = CADENCES

/* The days are always passed (assessment test, 2 November: the board said "Weekly, Thursdays." of a check-in that meets Monday and
   Thursday), so no line names a rhythm without reading them. Null where nothing is chosen yet. */
export const cadenceLabel = (c: GroundCadence, cadenceDays: number[] | null | undefined): string => {
  const often = timesAWeek(c, cadenceDays)
  return often ? `${often[0].toUpperCase()}${often.slice(1)}` : CADENCES.find((x) => x.cadence === c)?.label ?? String(c)
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TIMES = ['', 'once', 'twice', 'three times', 'four times', 'five times', 'six times', 'seven times']

/**
 * TWICE OR MORE A WEEK (2 November 2026): "twice a week, on Monday and Thursday", the one wording every page uses for a weekly
 * check-in that meets on more than one day (Ground.cadenceDays, served with the check-in). The server says it the same way
 * (grounds/the-check-ins-own-schedule.ts, timesAWeekInWords). Null when it meets once a week or less.
 */
export function timesAWeek(cadence: string | null | undefined, cadenceDays?: number[] | null): string | null {
  if (cadence !== 'WEEKLY') return null
  const days = [...new Set((cadenceDays ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b)
  if (days.length < 2) return null
  const names = days.map((d) => WEEKDAY_NAMES[d])
  return `${TIMES[days.length]} a week, on ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * How many sessions a timeframe holds at this cadence.
 *
 * At least one, always: a two-week ground on a monthly cadence still has a
 * check-in in it, and showing "0 sessions" would read as broken.
 */
export function sessionsFor(timelineDays: number, cadence: GroundCadence): number | null {
  const days = CADENCES.find((c) => c.cadence === cadence)?.days
  if (!days) return null
  return Math.max(1, Math.floor(timelineDays / days))
}
