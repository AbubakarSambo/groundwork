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

export const CADENCES: CadenceOption[] = [
  { cadence: 'DAILY', label: 'Daily', days: 1 },
  { cadence: 'WEEKLY', label: 'Weekly', days: 7 },
  { cadence: 'FORTNIGHTLY', label: 'Fortnightly', days: 14 },
  { cadence: 'MONTHLY', label: 'Monthly', days: 30 },
  { cadence: 'SEQUENTIAL', label: 'When the lead checks in', days: null },
]

/** The cadences offered when someone is choosing a regular rhythm. */
export const TIMED_CADENCES = CADENCES.filter((c) => c.days !== null)

export const cadenceLabel = (c: GroundCadence): string =>
  CADENCES.find((x) => x.cadence === c)?.label ?? String(c)

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
