import { describe, it, expect } from 'vitest'
import { theFreeTrialSentence } from './the-free-trial'

describe('the one sentence about the free trial', () => {
  it('says the prototype\'s sentence from the numbers it is given', () => {
    expect(theFreeTrialSentence({ on: true, teamsUnder: 20, months: 3 })).toBe('Teams of fewer than 20 people get 3 months free. No card needed.')
    expect(theFreeTrialSentence({ on: true, teamsUnder: 25, months: 1 })).toBe('Teams of fewer than 25 people get 1 month free. No card needed.')
  })

  it('says nothing while the trial is off, or when nothing came back', () => {
    expect(theFreeTrialSentence({ on: false, teamsUnder: 20, months: 3 })).toBeNull()
    expect(theFreeTrialSentence(undefined)).toBeNull()
    expect(theFreeTrialSentence({ on: true, teamsUnder: 0, months: 3 })).toBeNull()
  })
})
