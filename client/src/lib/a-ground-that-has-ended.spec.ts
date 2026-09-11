import { describe, it, expect } from 'vitest'
import { hasEnded, howItEnded, humanEndState } from './a-ground-that-has-ended'

describe('a ground that has ended, on the screens', () => {
  it('knows the three states that end one', () => {
    for (const s of ['RESOLVED', 'CLOSED', 'STALLED']) expect(hasEnded(s)).toBe(true)
    for (const s of ['OPEN', 'ACTIVE', 'AWAITING_PARTIES', 'REPORT_READY', 'PAUSED', null, undefined]) expect(hasEnded(s)).toBe(false)
  })

  it('says what ended it, in the words a person would use', () => {
    expect(howItEnded({ status: 'CLOSED', endState: 'KEEP' })).toBe('Ended · keep the hire')
    expect(howItEnded({ status: 'CLOSED' })).toBe('Ended')
    expect(howItEnded({ status: 'STALLED', endState: 'KEEP' })).toBe('Ended without an agreed outcome')
    expect(howItEnded({ status: 'ACTIVE', endState: 'KEEP' })).toBeNull()
  })

  it('never shouts an end state back at anybody', () => {
    expect(humanEndState('KEEP')).toBe('keep the hire')
    expect(humanEndState('SOMETHING_ELSE')).toBe('something else')
  })
})
