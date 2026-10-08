import { describe, it, expect } from 'vitest'
import { railAttention } from './rail-attention'
import { howManyHaveNotAnsweredYet } from './a-number-up-to-ten-in-words'

/**
 * Release check, 9 October. Baraka set up an anchor check-in for Kito and Lerato. His page read "Two of the three have not answered
 * yet." above "Nobody has checked in yet.": his set-up conversation was counted as an answer, and he was counted as one of the people.
 */
const ground = {
  status: 'ACTIVE',
  participants: [
    { id: 'p-lead', userId: 'u-lead', managingOnly: true },
    { id: 'p-kito', userId: 'u-kito', managingOnly: false },
    { id: 'p-lerato', userId: 'u-lerato', managingOnly: false },
  ],
  checkIns: [
    { participantId: 'p-lead', sessionNumber: 1, status: 'COMPLETED', availableFrom: null, isSetup: true },
    { participantId: 'p-kito', sessionNumber: 1, status: 'NOT_STARTED', availableFrom: null, isSetup: false },
    { participantId: 'p-lerato', sessionNumber: 1, status: 'NOT_STARTED', availableFrom: null, isSetup: false },
  ],
}

describe('the lead who only manages, and her set-up conversation, are not counted', () => {
  it('waits on two of two, not two of three', () => {
    expect(railAttention(ground, 'u-lead')).toEqual({ kind: 'waiting', done: 0, total: 2 })
  })
  it('says everybody still out as a sentence', () => {
    expect(howManyHaveNotAnsweredYet(2, 2)).toBe('Neither of the two has answered yet.')
    expect(howManyHaveNotAnsweredYet(3, 3)).toBe('None of the three has answered yet.')
    expect(howManyHaveNotAnsweredYet(1, 2)).toBe('One of the two has not answered yet.')
  })
})
