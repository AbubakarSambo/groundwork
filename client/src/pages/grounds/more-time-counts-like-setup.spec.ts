import { describe, it, expect } from 'vitest'
import { sessionsUpToTheEnd, theTimeframeToSave } from './CheckInPeopleAndSetup'

/**
 * "GIVE IT MORE TIME", AS THE LEAD READS IT ON PEOPLE AND SETUP (journey test, 12 October 2026). The note
 * under "Ends on" divided days by the rhythm's gap; it now counts the sessions that open up to the end,
 * the same as setup and the server (api: more-time-to-an-end-counts-like-setup.spec.ts), and the end is sent.
 */
const weeklyMondays = {
  startsAtOnRecord: null, createdAtOnRecord: new Date(2026, 9, 11, 15, 0).toISOString(),
  timelineDaysDraft: 48, cadenceDraft: 'WEEKLY', workingDaysDraft: [] as number[], anchorDayDraft: 1,
}

describe('the timeframe on People and setup', () => {
  it('counts seven sessions to Saturday 28 November, not six', () => {
    expect(sessionsUpToTheEnd(weeklyMondays)).toBe(7)
  })
  it('sends the end date with the days', () => {
    expect(theTimeframeToSave(weeklyMondays)).toMatchObject({ timelineDays: 48, endsOn: '2026-11-28' })
  })
})
