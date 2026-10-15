import { describe, it, expect } from 'vitest'
import { theScheduleTheySaid } from './the-schedule-they-said'

/**
 * DROP ACCESS'S "DAILY" STAYED DAILY (local test, 15 October 2026). Hafsah's setup, in her own three answers. The third,
 * about the weekly review she runs, turned the check-in weekly on Thursdays without asking.
 */
const DROP = [
  'A daily check-in for my sales team: deals in progress, what was sold with proof, and who is waiting on whom',
  'We want 40 paid sales by 31 December. A sale counts only when finance has matched an M-Pesa receipt or bank slip to the invoice.',
  'One shared target for the team. I own my own 10 deals and the weekly review.',
]

describe('how often, from what Hafsah said', () => {
  it('is every day: "the weekly review" is a meeting she runs, not how often the check-in happens', () => {
    expect(theScheduleTheySaid(DROP).cadence).toBe('DAILY')
  })
  it('a rhythm said about the check-in itself still counts, the last one said', () => {
    expect(theScheduleTheySaid([...DROP, 'Actually, make it weekly.']).cadence).toBe('WEEKLY')
    expect(theScheduleTheySaid(['A weekly check-in for the sales team.']).cadence).toBe('WEEKLY')
    expect(theScheduleTheySaid(['We do a monthly update.']).cadence).toBe('MONTHLY')
  })
  it('other things with a rhythm in their name are left alone', () => {
    expect(theScheduleTheySaid(['Our daily standup is at nine and the monthly target is 40.']).cadence).toBeUndefined()
  })
})
