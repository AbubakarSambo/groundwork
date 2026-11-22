import { describe, it, expect } from 'vitest'
import { theDaysADailyCheckInTakes, theDaysToSave } from './a-daily-check-in-is-weekdays'
import { theScheduleTheySaid } from './the-schedule-they-said'
import { theDatesInWords } from '@/pages/enter/TheSetup'

/**
 * A DAILY CHECK-IN IS MONDAY TO FRIDAY UNLESS THE LEAD SAYS OTHERWISE (Hafsah, 15 October 2026). In the local test of
 * staging's code, Drop Access's "Every day" made 90 check-ins with every weekend in them, running to 12 January 2027, and
 * Muchemi's "every working day until the end of the year" opened on Saturdays and Sundays and ended on 26 December.
 */
const TODAY = new Date(2026, 9, 15) // Thursday 15 October 2026

describe('what Hafsah reads on the setup when she says "daily"', () => {
  it('the days default to Monday to Friday, and the list skips the weekend', () => {
    const days = theDaysADailyCheckInTakes('DAILY', [], false, false)!
    expect(days).toEqual([1, 2, 3, 4, 5])
    /* The days and the count are the server's now (POST /entry/the-dates); this is how they read. */
    expect(theDatesInWords({ days: ['2026-10-15', '2026-10-16', '2026-10-19', '2026-10-20', '2026-10-21'], count: 56 }, 'DAILY', '2026-12-31'))
      .toBe('Check-ins open on Thu 15 October, Fri 16, Mon 19, Tue 20, Wed 21 and on from there, until 31 December, 56 check-ins in all.')
  })

  it('"Any day is fine", once she chooses it, stays her choice and is saved as every day', () => {
    expect(theDaysADailyCheckInTakes('DAILY', [], true, false)).toBeNull()
    expect(theDaysToSave('DAILY', [], true)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(theDaysToSave('DAILY', [1, 2, 3, 4, 5], false)).toEqual([1, 2, 3, 4, 5])
  })

  it('a weekly check-in keeps no weekday default, so a Saturday stays a Saturday', () => {
    expect(theDaysADailyCheckInTakes('WEEKLY', [1, 2, 3, 4, 5], false, true)).toEqual([])
    expect(theDaysADailyCheckInTakes('WEEKLY', [], false, false)).toBeNull()
    expect(theDaysToSave('WEEKLY', [], false)).toBeUndefined()
  })
})

describe('Muchemi\'s "every working day until the end of the year"', () => {
  it('is read as Monday to Friday, ending on 31 December', () => {
    expect(theScheduleTheySaid(['Daily, every working day until the end of the year.'], TODAY)).toEqual({ workingDays: [1, 2, 3, 4, 5], endsOn: '2026-12-31', cadence: 'DAILY' })
  })
  it('and "until the end of November" ends on the last day of November', () => {
    expect(theScheduleTheySaid(['Weekly until the end of November'], TODAY).endsOn).toBe('2026-11-30')
  })
})
