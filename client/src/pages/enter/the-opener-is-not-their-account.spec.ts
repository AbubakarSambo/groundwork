import { describe, it, expect } from 'vitest'
import { withoutPickedOpener } from './EntryChatPage'
import { SITUATION_CARDS } from './EntryChatPage'

/**
 * THE SENTENCE THE PRODUCT WROTE IS NOT THE COORDINATOR'S ACCOUNT.
 *
 * Setup opens with a first-person sentence lifted from whichever situation card was clicked. Nobody
 * typed it. For a party it is roughly what they meant. For somebody setting this up FOR other people
 * it is the product writing an account in their voice about a situation they never described - and
 * goals were being extracted from it as though they had said them.
 *
 * PROVEN AGAINST THE LIVE ENDPOINT, TWICE. First that it happened: a coordinator who said only "I am
 * the ops admin, I do not really know the details" came back with one goal, the canned sentence
 * almost verbatim. Then that an instruction did not fix it: told in the prompt not to take goals or a
 * situation from that opener, the model stopped taking `initial` and `decision` and kept taking
 * `goals`. Hence removal rather than a rule.
 */
const CANNED = SITUATION_CARDS[0].message

describe('the opener is not their account', () => {
  const history = [
    { role: 'user', content: CANNED },
    { role: 'assistant', content: 'are you part of this?' },
    { role: 'user', content: 'I am the ops admin, I do not know the details.' },
  ]

  it('keeps it for a party, whose pick is close enough to what they meant', () => {
    expect(withoutPickedOpener(history, 'a_party')).toHaveLength(3)
  })

  it('drops it for somebody setting this up for other people', () => {
    const out = withoutPickedOpener(history, 'setting_up_for_others')
    expect(out).toHaveLength(2)
    expect(out.some((t) => t.content === CANNED)).toBe(false)
  })

  it('keeps everything they actually typed', () => {
    const out = withoutPickedOpener(history, 'setting_up_for_others')
    expect(out.some((t) => t.content === 'I am the ops admin, I do not know the details.')).toBe(true)
  })

  /**
   * Somebody who typed their own opening sentence said it. Only the canned one is removed, so a
   * coordinator who described the situation in their own words keeps that description.
   */
  it('never drops a sentence the person wrote themselves', () => {
    const typed = [
      { role: 'user', content: 'Setting this up for the delivery team, I think it is about the launch.' },
      { role: 'user', content: 'I am the ops admin.' },
    ]
    expect(withoutPickedOpener(typed, 'setting_up_for_others')).toHaveLength(2)
  })

  /** Before the role is known nothing is removed - the answer is not in yet. */
  it('changes nothing while the role is still unknown', () => {
    expect(withoutPickedOpener(history, null)).toHaveLength(3)
  })
})
