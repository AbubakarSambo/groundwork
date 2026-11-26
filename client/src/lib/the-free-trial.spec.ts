import { describe, it, expect } from 'vitest'
import { theFreeTrialSentence } from './the-free-trial'

describe('the one sentence about the free trial', () => {
  /*
   * Served months changed from 3 to 1 here (decision 78, 5 October: every free run is one month,
   * where it was three) - the served trial is one month today, so the pinned sentence now says so.
   */
  it('says the prototype\'s sentence from the numbers it is given', () => {
    expect(theFreeTrialSentence({ on: true, teamsUnder: 20, months: 1 })).toBe('Every team gets 1 month free, with WhatsApp for up to 20 people. No card required.')
    expect(theFreeTrialSentence({ on: true, teamsUnder: 25, months: 2 })).toBe('Every team gets 2 months free, with WhatsApp for up to 25 people. No card required.')
  })

  it('says nothing while the trial is off, or when nothing came back', () => {
    expect(theFreeTrialSentence({ on: false, teamsUnder: 20, months: 1 })).toBeNull()
    expect(theFreeTrialSentence(undefined)).toBeNull()
    expect(theFreeTrialSentence({ on: true, teamsUnder: 0, months: 1 })).toBeNull()
  })
})
