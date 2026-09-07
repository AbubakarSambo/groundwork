import { describe, it, expect } from 'vitest'
import { withoutPickedOpener } from './EntryChatPage'
import { SITUATION_CARDS } from './EntryChatPage'

/**
 * THE SENTENCE THE PRODUCT WROTE IS NOBODY'S ACCOUNT - AND CUTTING IT BROKE THE FIRST TURN.
 *
 * Two bugs, one line of code, and the second was caused by fixing the first.
 *
 * ONE: the extractor lifted goals out of the canned opener. Proven against the live endpoint twice -
 * first that it happened, then that an instruction did not stop it: told not to take goals or a
 * situation from that sentence, the model stopped taking `initial` and `decision` and kept taking
 * `goals`. So the sentence was cut from what the extractor sees.
 *
 * TWO: on the first turn after a click, that sentence is the ONLY user message. Cutting it left the
 * model an assistant greeting and nothing to answer, so it wrote a user line for itself and replied
 * to that - somebody who clicked "a quick recurring check-in with my team" was answered with "I want
 * one honest read from everyone on my team this week. Who is on the team?", a different card's
 * sentence spoken back as though they had said it. Reproduced against the live endpoint, and it is
 * what these tests now pin.
 *
 * The turn stays; its content becomes a flat third-person note naming the card. Nothing first-person
 * to mistake for an account, and something for the model to answer.
 */
const CANNED = SITUATION_CARDS[0].message

describe('the opener is not their account', () => {
  const history = [
    { role: 'user', content: CANNED },
    { role: 'assistant', content: 'who is the new hire?' },
    { role: 'user', content: 'I am the ops admin, I do not know the details.' },
  ]

  it('replaces the canned opener rather than removing it', () => {
    const out = withoutPickedOpener(history)
    /* Same number of turns. Removing one is what left the model nothing to answer. */
    expect(out).toHaveLength(3)
    expect(out.some((t) => t.content === CANNED)).toBe(false)
  })

  it('and what replaces it says which card, in the third person', () => {
    const swapped = withoutPickedOpener(history)[0].content
    expect(swapped).toContain(SITUATION_CARDS[0].label)
    /* No "I want", no "we are" - nothing that reads as something they said about themselves. */
    expect(swapped).not.toMatch(/\b(I|we|my|our)\b/)
  })

  it('keeps everything they actually typed', () => {
    const out = withoutPickedOpener(history)
    expect(out.some((t) => t.content === 'I am the ops admin, I do not know the details.')).toBe(true)
  })

  /**
   * Somebody who typed their own opening sentence said it. Only the canned one is removed, so a
   * person who described the situation in their own words keeps that description.
   */
  it('never touches a sentence the person wrote themselves', () => {
    const typed = [
      { role: 'user', content: 'Setting this up for the delivery team, I think it is about the launch.' },
      { role: 'user', content: 'I am the ops admin.' },
    ]
    expect(withoutPickedOpener(typed)).toEqual(typed)
  })

  it('only ever removes the FIRST turn, so a card sentence quoted later survives', () => {
    /* Somebody can legitimately paste the same words back - "yes, exactly that" territory. What is
       removed is the opener the product put there, which is only ever the first user turn. */
    const quoted = [
      { role: 'user', content: 'Something I typed myself.' },
      { role: 'user', content: CANNED },
    ]
    expect(withoutPickedOpener(quoted)).toEqual(quoted)
  })
})
