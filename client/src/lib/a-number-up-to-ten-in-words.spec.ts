import { describe, it, expect } from 'vitest'
import { numberUpToTenInWords, howManyHaveNotAnsweredYet } from './a-number-up-to-ten-in-words'

describe('numberUpToTenInWords', () => {
  it('spells zero through ten', () => {
    expect(numberUpToTenInWords(0)).toBe('zero')
    expect(numberUpToTenInWords(1)).toBe('one')
    expect(numberUpToTenInWords(10)).toBe('ten')
  })

  it('falls back to the digit past ten', () => {
    expect(numberUpToTenInWords(11)).toBe('11')
  })
})

describe('howManyHaveNotAnsweredYet: screen fault 4, final walk', () => {
  it('reads "One of the three has not answered yet.", not "1 of the 3 have not answered yet."', () => {
    expect(howManyHaveNotAnsweredYet(1, 3)).toBe('One of the three has not answered yet.')
  })

  it('uses "have" for more than one person left over', () => {
    expect(howManyHaveNotAnsweredYet(2, 5)).toBe('Two of the five have not answered yet.')
  })
})

describe('howManyHaveNotAnsweredYet: B-108, nobody has answered yet', () => {
  it('reads "Neither of the two has answered yet.", not "Two of the two have not answered yet."', () => {
    expect(howManyHaveNotAnsweredYet(2, 2)).toBe('Neither of the two has answered yet.')
  })

  it('reads "None of the three has answered yet." for more than two, all still outstanding', () => {
    expect(howManyHaveNotAnsweredYet(3, 3)).toBe('None of the three has answered yet.')
  })

  /*
   * UPDATED, NOT JUST ADDED: "One of the one has not answered yet." was itself wrong wording -
   * "of the one" is not English, the same fault B-056 already fixed for `howManyCheckedInSentence`
   * ("The one person in it has checked in for session N."). The old assertion pinned the bug it
   * should have been catching, so it is replaced rather than left beside a new, correct one.
   */
  it('reads "The one person in it has not answered yet." for a single person, not "One of the one..."', () => {
    expect(howManyHaveNotAnsweredYet(1, 1)).toBe('The one person in it has not answered yet.')
  })
})
