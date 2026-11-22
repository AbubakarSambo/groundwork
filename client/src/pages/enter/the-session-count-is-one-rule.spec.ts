import { describe, it, expect } from 'vitest'
import { theDatesInWords } from './TheSetup'
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

/* Setup no longer counts: the days and the count are the server's own (POST /entry/the-dates, the-dates-before-it-is-saved.spec.ts on
   the API), so the two can never disagree (Hafsah, 22 November 2026: 29 on the page, 25 saved). These check how the served days read. */
describe('setup says the days the server will open, and its count', () => {
  it('weekly on Mondays, seven in all', () => {
    expect(theDatesInWords({ days: ['2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09'], count: 7 }, 'WEEKLY', '2026-11-29'))
      .toBe('Check-ins open on Mon 12 October, Mon 19, Mon 26, Mon 2 November, Mon 9 and on from there, until 29 November, 7 check-ins in all.')
  })
  it('all of them, when they fit in one sentence', () => {
    expect(theDatesInWords({ days: ['2026-10-12', '2026-10-26', '2026-11-09'], count: 3 }, 'FORTNIGHTLY', '2026-11-30'))
      .toBe('Check-ins open on Mon 12 October, Mon 26 and Mon 9 November, 3 check-ins in all.')
  })
  it('with no end, it says "and on from there"', () => {
    expect(theDatesInWords({ days: ['2026-10-20', '2026-11-20'], count: null }, 'MONTHLY'))
      .toBe('Check-ins open on Tue 20 October, Fri 20 November and on from there.')
  })
})

describe('the end date is never read as the day it was made', () => {
  it('the invitation says it too, and keeps the prototype\'s "until 30 September" in the same year', () => {
    expect(whereAndUntil({ organisationName: 'Brightloom', endsAt: '2027-10-11T00:00:00.000Z', today: SUNDAY })).toBe('Brightloom, until 11 October 2027.') /* F5: the target journey's words */
    expect(theLastDay('2026-09-30T00:00:00.000Z', new Date(2026, 5, 30))).toBe('30 September')
  })
  it('People and setup reads "12 October to 11 October 2027"', () => {
    expect(theLastDay('2027-10-11T00:00:00.000Z', '2026-10-12T00:00:00.000Z')).toBe('11 October 2027')
  })
})
