import { describe, it, expect } from 'vitest'
import { asTheirWords, isTheEnginesOwnNote } from './as-their-words'

describe('a record line reads as the person would say it', () => {
  it('drops the tier, the inference note and the difference label', () => {
    expect(asTheirWords('[VERIFIABILITY:HIGH] At 90 days: eight conversations.')).toBe('At 90 days: eight conversations.')
    expect(asTheirWords('I have not said this to her yet. [INFERRED: An unstated expectation is a source of tension]')).toBe('I have not said this to her yet.')
    expect(asTheirWords('OPERATING_DIFFERENCE: On keeping the tracker current')).toBe('On keeping the tracker current')
  })
  it('knows which lines are the engine talking to itself', () => {
    expect(isTheEnginesOwnNote('OPERATING_DIFFERENCE: On x, they described y')).toBe(true)
    expect(isTheEnginesOwnNote('The tracker was updated.')).toBe(false)
  })
})
