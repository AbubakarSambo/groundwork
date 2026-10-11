import { describe, it, expect } from 'vitest'
import { hasEnded, howItEnded, humanEndState } from './a-ground-that-has-ended'

describe('a ground that has ended, on the screens', () => {
  it('knows the two states that end one', () => {
    for (const s of ['RESOLVED', 'CLOSED']) expect(hasEnded(s)).toBe(true)
    /* STALLED left. It is what happens when the time runs out, not a decision anybody took, and
       filing it here is what made it irreversible on every screen. See a-shut-check-in-is-not-
       your-turn. */
    for (const s of ['OPEN', 'ACTIVE', 'AWAITING_PARTIES', 'REPORT_READY', 'PAUSED', 'STALLED', null, undefined]) expect(hasEnded(s)).toBe(false)
  })

  /*
   * B-020: "Ended · stop" was two pieces joined by a dot, the second being the outcome's own
   * internal key lowercased - a fragment, not a sentence, and CLAUDE.md's wording rule forbids a
   * colon/dash/dot join exactly like it. Updated to the full-sentence form these two now pin,
   * matching the shape the server's own `howItEnded` already writes
   * (api/src/modules/grounds/a-ground-that-has-ended.ts): "This check-in has ended." followed by
   * the outcome as its own sentence.
   */
  it('says what ended it, as a full sentence, never a dot-joined fragment', () => {
    expect(howItEnded({ status: 'CLOSED', endState: 'KEEP' })).toBe('This check-in has ended. The person stays in the role.')
    expect(howItEnded({ status: 'CLOSED' })).toBe('This check-in has ended.')
    /* And it does not say "ended" about the one state somebody can still do something about - that
       wording, in green, is why nobody tried. */
    expect(howItEnded({ status: 'STALLED', endState: 'KEEP' })).toBe('Out of time')
    expect(howItEnded({ status: 'ACTIVE', endState: 'KEEP' })).toBeNull()
  })

  it('never shouts an end state back at anybody', () => {
    expect(humanEndState('KEEP')).toBe('the person stays in the role')
    expect(humanEndState('SOMETHING_ELSE')).toBe('something else')
  })
})
