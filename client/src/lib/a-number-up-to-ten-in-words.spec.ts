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
