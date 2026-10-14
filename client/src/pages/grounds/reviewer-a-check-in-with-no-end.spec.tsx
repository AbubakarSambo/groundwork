import { describe, it, expect } from 'vitest'
import { theRhythmLine } from './CheckInPeopleAndSetup'

/* Reviewer, 14 October: People and setup read "Every day. 1 session in total." and "Runs for ? days." for a daily check-in with no end. */
describe('a check-in with no end, on People and setup', () => {
  it('reads like the setup: every day, until you end it', () => {
    expect(theRhythmLine({ cadence: 'DAILY', timelineDays: 0, runsUntilItIsEnded: true })).toBe('Every day, until you end it.')
    expect(theRhythmLine({ cadence: 'DAILY', timelineDays: null })).toBe('Every day, until you end it.')
  })
  it('a check-in with a length reads as before', () => {
    expect(theRhythmLine({ cadence: 'WEEKLY', timelineDays: 84, runsUntilItIsEnded: false })).toMatch(/^Every week\. 12 sessions in total\./)
  })
})
