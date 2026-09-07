import { describe, it, expect } from 'vitest'
import { withoutPickedOpener } from './EntryChatPage'
import { SITUATION_CARDS } from './EntryChatPage'

/**
 * THE SENTENCE THE PRODUCT WROTE IS NOBODY'S ACCOUNT.
 *
 * Setup opens with a first-person sentence lifted from whichever situation card was clicked. Nobody
 * typed it, and goals were being extracted from it as though they had said them.
 *
 * PROVEN AGAINST THE LIVE ENDPOINT, TWICE. First that it happened: somebody who said only "I am the
 * ops admin, I do not really know the details" came back with one goal, the canned sentence almost
 * verbatim. Then that an instruction did not fix it: told in the prompt not to take goals or a
 * situation from that opener, the model stopped taking `initial` and `decision` and kept taking
 * `goals`. Hence removal rather than a rule - it cannot lift what it cannot see.
 *
 * IT USED TO SPARE A PARTY'S OPENER AND NO LONGER DOES.
 *
 * The strip was conditional on `yourRole`, on the argument that a party's pick was near enough to
 * what they meant. Setup no longer asks the role - it is asked at the end, by the screen - so that
 * condition would sit unanswered and the strip would never run for anybody, putting the leak back
 * quietly for everyone. And "near enough to what they meant" is the same judgement that put a
 * sentence nobody typed into a goals array to begin with.
 */
const CANNED = SITUATION_CARDS[0].message

describe('the opener is not their account', () => {
  const history = [
    { role: 'user', content: CANNED },
    { role: 'assistant', content: 'who is the new hire?' },
    { role: 'user', content: 'I am the ops admin, I do not know the details.' },
  ]

  it('drops the canned opener, for everybody', () => {
    const out = withoutPickedOpener(history)
    expect(out).toHaveLength(2)
    expect(out.some((t) => t.content === CANNED)).toBe(false)
  })

  it('keeps everything they actually typed', () => {
    const out = withoutPickedOpener(history)
    expect(out.some((t) => t.content === 'I am the ops admin, I do not know the details.')).toBe(true)
  })

  /**
   * Somebody who typed their own opening sentence said it. Only the canned one is removed, so a
   * person who described the situation in their own words keeps that description.
   */
  it('never drops a sentence the person wrote themselves', () => {
    const typed = [
      { role: 'user', content: 'Setting this up for the delivery team, I think it is about the launch.' },
      { role: 'user', content: 'I am the ops admin.' },
    ]
    expect(withoutPickedOpener(typed)).toHaveLength(2)
  })

  it('only ever removes the FIRST turn, so a card sentence quoted later survives', () => {
    /* Somebody can legitimately paste the same words back - "yes, exactly that" territory. What is
       removed is the opener the product put there, which is only ever the first user turn. */
    const quoted = [
      { role: 'user', content: 'Something I typed myself.' },
      { role: 'user', content: CANNED },
    ]
    expect(withoutPickedOpener(quoted)).toHaveLength(2)
  })
})
