import { describe, it, expect } from 'vitest'
import { replyHasQuestion, onboardDisplayReply, ONBOARD_READY_CLOSER } from './EntryChatPage'

/**
 * Onboarding wrap-up jump tripwire.
 *
 * The /onboard endpoint computes `ready` from extracted fields in a separate AI
 * call from the one that writes `reply`, so it can return ready:true on a turn
 * whose reply STILL asks a question. When that happened the UI showed the
 * wrap-up card and hid the input, stranding a question the user could not
 * answer. onboardDisplayReply() is the client safety net: when ready fires on a
 * reply that still contains a question, it swaps in a clean no-question closer.
 *
 * If this guard is removed, a stranded question can reach the user again.
 */
describe('onboarding wrap-up jump safety net', () => {
  it('detects a question in the reply', () => {
    expect(replyHasQuestion('Who do you think should own this decision?')).toBe(true)
    expect(replyHasQuestion('Thanks, that is everything I need.')).toBe(false)
    expect(replyHasQuestion('')).toBe(false)
  })

  it('swaps a stranded question for the closer when ready fires (the tripwire)', () => {
    // This is the exact failure: ready:true AND the reply still asks a question.
    const questionReply = 'Got it. Who do you think should own this decision going forward?'
    expect(onboardDisplayReply(questionReply, true)).toBe(ONBOARD_READY_CLOSER)
  })

  it('keeps a clean closer verbatim when ready fires without a question', () => {
    const cleanCloser = 'Thanks. I have what I need. Next you will add the people involved, then end the session.'
    expect(onboardDisplayReply(cleanCloser, true)).toBe(cleanCloser)
  })

  it('never rewrites a mid-conversation question (not ready yet)', () => {
    // A legitimate question mid-onboarding must reach the user unchanged - the
    // input is still shown, so it is answerable and must not be suppressed.
    const midQuestion = 'And what is your own role in relation to them?'
    expect(onboardDisplayReply(midQuestion, false)).toBe(midQuestion)
  })
})
