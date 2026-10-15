/**
 * A DAILY CHECK-IN IS MONDAY TO FRIDAY UNLESS THE LEAD SAYS OTHERWISE (Hafsah, 15 October 2026).
 *
 * "Every day" made 90 check-ins with every Saturday and Sunday in them, running to 12 January, and "every working day
 * until the end of the year" still opened on weekends. The days were left empty unless she named them, and empty meant
 * any day. Now a daily check-in nobody gave days for takes Monday to Friday; "Any day is fine" is still hers to choose.
 */
export const MONDAY_TO_FRIDAY = [1, 2, 3, 4, 5]
export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6]

/**
 * The days to put on the summary now, or null to leave them. `chosen` is whether she chose days on the summary;
 * `defaulted` is whether the days showing are this default rather than anything she said.
 */
export function theDaysADailyCheckInTakes(cadence: string, days: number[], chosen: boolean, defaulted: boolean): number[] | null {
  if (chosen) return null
  if (cadence === 'DAILY') return days.length === 0 ? [...MONDAY_TO_FRIDAY] : null
  /* No longer daily: the weekday default goes, so a weekly check-in on a Saturday is not moved to Monday. */
  return defaulted ? [] : null
}

/**
 * The days sent when the check-in is saved. Her days when there are some. A daily check-in she chose "Any day is fine"
 * for is sent as every day, so the server does not take its empty answer as nobody having said (which is weekdays).
 */
export function theDaysToSave(cadence: string, days: number[], chosen: boolean): number[] | undefined {
  if (days.length) return days
  if (cadence === 'DAILY' && chosen) return [...EVERY_DAY]
  return undefined
}
