import { describe, it, expect } from 'vitest'
import { itIsStillAskingSomething } from './EntryChatPage'

/**
 * IT ASKED AND OFFERED TO CLOSE IN THE SAME BREATH.
 *
 * Read on a real setup, one reply:
 *
 *   "...You've said you'll handle that. What is the first thing you will do towards that, and when?"
 *   [ This session has reached a natural close. Would you like to end and see your report? ]
 *
 * Answer it and the banner is stale; end the session and the question goes unanswered - and it was
 * the commitment question, the one the record most needs.
 */
describe('whether the assistant is still asking', () => {
  it('is true when the turn ends on a question', () => {
    expect(itIsStillAskingSomething('That is noted. What is the first thing you will do, and when?')).toBe(true)
  })

  it('and false when it ends on a statement', () => {
    expect(itIsStillAskingSomething('Good. I have that Tunde and Priya will be told on Monday the 15th.')).toBe(false)
  })

  /** A question mid-paragraph is not the turn waiting on anything. */
  it('and reads the last sentence, not any question in the middle', () => {
    expect(itIsStillAskingSomething('Is that right? It sounded that way. I have it on the record now.')).toBe(false)
  })

  it('and says no to nothing at all', () => {
    expect(itIsStillAskingSomething('')).toBe(false)
    expect(itIsStillAskingSomething('   ')).toBe(false)
  })
})
