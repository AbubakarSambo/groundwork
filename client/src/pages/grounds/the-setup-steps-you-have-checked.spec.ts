import { describe, it, expect } from 'vitest'
import { howFarThroughSetup } from './the-setup-steps-you-have-checked'

describe('counting what has been signed off', () => {
  it('says nothing when there are no bands', () => {
    expect(howFarThroughSetup([], 0)).toBe('')
  })

  it('counts none, some and all', () => {
    expect(howFarThroughSetup([], 5)).toBe('You have not signed off any of the 5 setup questions yet.')
    expect(howFarThroughSetup([1, 2], 5)).toBe('2 of 5 setup questions signed off.')
    expect(howFarThroughSetup([1, 2, 3, 4, 5], 5)).toBe('You have looked at all 5 setup questions.')
  })

  it('counts a band twice as once, and one that is not on this page as none', () => {
    /* Read live as "6 of 5": the stored list outlives the page that wrote it, and a check-in in
       another family has a different number of bands. */
    expect(howFarThroughSetup([1, 1, 2], 5)).toBe('2 of 5 setup questions signed off.')
    expect(howFarThroughSetup([1, 2, 9], 5)).toBe('2 of 5 setup questions signed off.')
    expect(howFarThroughSetup([1, 2, 3, 4, 5, 9], 5)).toBe('You have looked at all 5 setup questions.')
  })
})
