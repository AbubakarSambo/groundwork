import { describe, it, expect } from 'vitest'
import { possessiveOf } from './a-possessive'

describe('a name\'s possessive, the English way (screen fault 5b)', () => {
  it('a name ending in "s" takes just an apostrophe', () => {
    expect(possessiveOf('Kijani Foods')).toBe('Kijani Foods’')
    expect(possessiveOf('Baridi Appliances')).toBe('Baridi Appliances’')
  })

  it('a name not ending in "s" takes the usual "\'s"', () => {
    expect(possessiveOf('Baridi')).toBe('Baridi’s')
    expect(possessiveOf('Nyali Foods Ltd')).toBe('Nyali Foods Ltd’s')
  })
})
