import { describe, it, expect } from 'vitest'
import { howManyCheckedInSentence } from './how-many-checked-in'

/* The numbers are now said in words up to ten (the screens' walk of the check-in page); the
   noun and the verb follow the same rule as F-18 set. */
describe('how many have checked in, as a sentence', () => {
  it('says people when there are several, and has when one has', () => {
    expect(howManyCheckedInSentence(1, 3, 1)).toBe('One of the three people has checked in for session 1.')
    expect(howManyCheckedInSentence(2, 3, 1)).toBe('Two of the three people have checked in for session 1.')
    expect(howManyCheckedInSentence(1, 1, 2)).toBe('The one person in it has checked in for session 2.')
    expect(howManyCheckedInSentence(12, 14, 1)).toBe('12 of the 14 people have checked in for session 1.')
  })
  it('and says nobody when nobody has', () => {
    expect(howManyCheckedInSentence(0, 3, 1)).toBe('Nobody has checked in yet.')
  })
})
