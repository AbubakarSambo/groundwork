import { describe, it, expect } from 'vitest'
import { isEndIntent } from './EntryChatPage'

/**
 * Entry check-in end-intent tripwire (severity-0 regression guard).
 *
 * The anonymous entry check-in detected completion ONLY from the AI's reply text, never
 * from the user's message. So a person who typed "yes I want to submit my answers" got
 * affirmed and looped forever - they could not finish even by asking. `isEndIntent` reads
 * the USER's message so explicit end-intent surfaces the end control.
 *
 * If the real failing phrase ever stops matching, the loop is back. Do not loosen the
 * false-positive cases either - a stray match would end someone's session mid-thought.
 */
describe('entry end-intent detection', () => {
  it('catches the real failing case and its natural variants', () => {
    for (const s of [
      'yes I want to submit my answers',      // the exact reported failure
      'yes, submit my answers',
      'I want to submit my responses',
      "I'm done",
      'I am done',
      "I'm finished",
      'ok I am ready to submit',
      'end the session',
      'end this check-in',
      'can we finish the session',
      "that's all",
      'that is everything',
      'submit my record',
    ]) {
      expect(isEndIntent(s), `should detect end-intent: "${s}"`).toBe(true)
    }
  })

  it('does NOT false-positive on mid-conversation mentions', () => {
    for (const s of [
      'I submitted a proposal to the board last quarter',
      'we need to finish the migration before the deadline',
      'the team is done with phase one but not the rollout',
      'should I submit this to my manager?',
      'my main goal is to end the quarter on target',
      'here is what I have been working on',
      'we are aligned on the roadmap',
    ]) {
      expect(isEndIntent(s), `should NOT end-intent: "${s}"`).toBe(false)
    }
  })
})
