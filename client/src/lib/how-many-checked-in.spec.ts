import { describe, it, expect } from 'vitest'
import { howManyCheckedInSentence } from './how-many-checked-in'

describe('how many have checked in, as a sentence', () => {
  it('says people when there are several, and has when one has', () => {
    expect(howManyCheckedInSentence(1, 3, 1)).toBe('1 of 3 people has checked in for session 1.')
    expect(howManyCheckedInSentence(2, 3, 1)).toBe('2 of 3 people have checked in for session 1.')
    expect(howManyCheckedInSentence(1, 1, 2)).toBe('1 of 1 person has checked in for session 2.')
  })
  it('and says nobody when nobody has', () => {
    expect(howManyCheckedInSentence(0, 3, 1)).toBe('Nobody has checked in yet.')
  })
})
