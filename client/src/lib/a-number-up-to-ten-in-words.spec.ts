import { describe, it, expect } from 'vitest'
import { numberUpToTenInWords } from './a-number-up-to-ten-in-words'

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
