import { describe, it, expect } from 'vitest'
import { hasEnded, howItEnded, humanEndState } from './a-ground-that-has-ended'

describe('a ground that has ended, on the screens', () => {
  it('knows the two states that end one', () => {
    for (const s of ['RESOLVED', 'CLOSED']) expect(hasEnded(s)).toBe(true)
    /* STALLED left. It is what happens when the time runs out, not a decision anybody took, and
       filing it here is what made it irreversible on every screen. See a-shut-check-in-is-not-
       your-turn. */
    for (const s of ['OPEN', 'ACTIVE', 'AWAITING_PARTIES', 'REPORT_READY', 'PAUSED', 'STALLED', null, undefined]) expect(hasEnded(s)).toBe(false)
  })

  it('says what ended it, in the words a person would use', () => {
    expect(howItEnded({ status: 'CLOSED', endState: 'KEEP' })).toBe('Ended · keep the hire')
    expect(howItEnded({ status: 'CLOSED' })).toBe('Ended')
    /* And it does not say "ended" about the one state somebody can still do something about - that
       wording, in green, is why nobody tried. */
    expect(howItEnded({ status: 'STALLED', endState: 'KEEP' })).toBe('Out of time')
    expect(howItEnded({ status: 'ACTIVE', endState: 'KEEP' })).toBeNull()
  })

  it('never shouts an end state back at anybody', () => {
    expect(humanEndState('KEEP')).toBe('keep the hire')
    expect(humanEndState('SOMETHING_ELSE')).toBe('something else')
  })
})
