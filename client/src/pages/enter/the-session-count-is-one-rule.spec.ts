import { describe, it, expect } from 'vitest'
import { whenTheyOpen } from './TheSetup'
import { whereAndUntil } from '../invite/InvitePage'
import { theLastDay } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * ONE COUNT, ONE END DATE (journey test, 12 October 2026). One check-in read 12, then 65, then 261
 * sessions, and its invitation said it ran "until 11 October", the day it was made, when it ran to
 * 11 October 2027. Setup's count is the schedule's own rounds, which is what the server now saves
 * (api: the-chosen-end-sets-how-long-it-runs.spec.ts holds the same three cases and numbers), and the
 * end date carries its year whenever the year is not the one it starts in.
 */
const SUNDAY = new Date(2026, 9, 11, 15, 0)

describe('setup counts the sessions the server saves', () => {
  it('weekly on Mondays, "Now" on Sunday 11 October, until Sunday 29 November: 7', () => {
    expect(whenTheyOpen({ cadence: 'WEEKLY', anchorDay: 1, startsOn: '', endsOn: '2026-11-29', workingDays: [], today: SUNDAY }))
      .toBe('Check-ins open on Sun 11 October, Mon 19, Mon 26, Mon 2 November, Mon 9 and on from there, until 29 November, 7 sessions in all.')
  })
  it('fortnightly on Mondays, until Monday 30 November: 5', () => {
    expect(whenTheyOpen({ cadence: 'FORTNIGHTLY', anchorDay: 1, startsOn: '', endsOn: '2026-11-30', workingDays: [], today: SUNDAY }))
      .toBe('Check-ins open on Sun 11 October, Mon 19, Mon 2 November, Mon 16 and Mon 30, 5 sessions in all.')
  })
  it('monthly on the 20th, until 15 January: 3', () => {
    expect(whenTheyOpen({ cadence: 'MONTHLY', anchorDay: 20, startsOn: '', endsOn: '2027-01-15', workingDays: [], today: SUNDAY }))
      .toBe('Check-ins open on Sun 11 October, Fri 20 November and Sun 20 December, 3 sessions in all.')
  })
})

describe('the end date is never read as the day it was made', () => {
  it('setup says the year of an end in another year', () => {
    expect(whenTheyOpen({ cadence: 'DAILY', anchorDay: null, startsOn: '', endsOn: '2027-10-11', workingDays: [1, 2, 3, 4, 5], today: SUNDAY }))
      .toBe('Check-ins open on Mon 12 October, Tue 13, Wed 14, Thu 15, Fri 16 and on from there, until 11 October 2027, 261 sessions in all.')
  })
  it('the invitation says it too, and keeps the prototype\'s "until 30 September" in the same year', () => {
    expect(whereAndUntil({ organisationName: 'Brightloom', endsAt: '2027-10-11T00:00:00.000Z', today: SUNDAY })).toBe('This runs at Brightloom until 11 October 2027.')
    expect(theLastDay('2026-09-30T00:00:00.000Z', new Date(2026, 5, 30))).toBe('30 September')
  })
  it('People and setup reads "12 October to 11 October 2027"', () => {
    expect(theLastDay('2027-10-11T00:00:00.000Z', '2026-10-12T00:00:00.000Z')).toBe('11 October 2027')
  })
})
