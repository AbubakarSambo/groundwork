import { describe, it, expect } from 'vitest'
import { theDaysInASentence, everyDayThatTheyWork } from './the-days-in-words'
import { howOftenTheTeamChecksIn, theClosingAfterYourFirstCheckIn, theRhythmInFull } from './the-closing-after-your-first-check-in'
import { thePlanInTheHeader } from '@/pages/enter/TheSetup'

/* Setup page review, 13 October: clipped day sentences, "Every day." on a weekdays-only check-in,
   and "10 sessions planned" on a check-in with no end. Each read as a person reads it. */
describe('the days, in full sentences', () => {
  it('says each case the reviewer read, and the general one', () => {
    expect(theDaysInASentence([1, 2, 3, 4, 5])).toBe('Check-ins open on weekdays only, never at the weekend.')
    expect(theDaysInASentence([1, 2, 3, 4, 5, 6])).toBe('Check-ins open Monday to Saturday, never on a Sunday.')
    expect(theDaysInASentence([])).toBe('Check-ins can open on any day, including Saturday and Sunday.')
    expect(theDaysInASentence([1, 3, 5])).toBe('Check-ins open on Monday, Wednesday and Friday, never on Tuesday, Thursday, Saturday or Sunday.')
    expect(theDaysInASentence([6, 0])).toBe('Check-ins open on Saturday and Sunday, never on Monday, Tuesday, Wednesday, Thursday or Friday.')
  })

  it('a daily rhythm follows the days', () => {
    expect(everyDayThatTheyWork([1, 2, 3, 4, 5])).toBe('every weekday, Monday to Friday')
    expect(howOftenTheTeamChecksIn({ cadence: 'DAILY', workingDays: [1, 2, 3, 4, 5] })).toBe('every weekday, Monday to Friday')
    expect(theRhythmInFull({ cadence: 'DAILY', workingDays: [1, 2, 3, 4, 5] })).toBe('Every weekday, Monday to Friday.')
    expect(theRhythmInFull({ cadence: 'DAILY', workingDays: [] })).toBe('Every day.')
    expect(theRhythmInFull({ cadence: 'WEEKLY', cadenceAnchorDay: 4 }, { untilEnded: true })).toBe('Every Thursday, until you end it.')
    expect(theClosingAfterYourFirstCheckIn({ cadence: 'DAILY', workingDays: [1, 2, 3, 4, 5] }).before)
      .toContain('Your team will check in every weekday, Monday to Friday.')
  })

  it('the header says the rhythm, not a count, when there is no end', () => {
    expect(thePlanInTheHeader({ planned: 10, cadence: 'WEEKLY', runsUntilEnded: true, anchorDay: 4, workingDays: [], startsOn: '' })).toBe('Every Thursday, until you end it')
    /* Second round: "check-ins", the summary's word, not "sessions". */
    expect(thePlanInTheHeader({ planned: 10, cadence: 'WEEKLY', runsUntilEnded: false, anchorDay: 4, workingDays: [], startsOn: '' })).toBe('10 check-ins planned')
    expect(thePlanInTheHeader({ planned: 1, cadence: 'ONE_TIME', runsUntilEnded: false, anchorDay: null, workingDays: [], startsOn: '' })).toBe('1 check-in planned')
  })
})
