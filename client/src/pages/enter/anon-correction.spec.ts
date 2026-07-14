import { describe, it, expect } from 'vitest'
import { CORRECTION_PREFIX, buildCorrectionTurn, withCorrection, isCorrectionTurn } from './EntryChatPage'

/**
 * Anonymous-correction tripwire (ISSUE-17 safe by construction).
 *
 * The correction mechanism is: append ONE user-authored turn to the in-session
 * transcript and regenerate the report from the corrected transcript. Report
 * fields are never patched directly - a report the transcript does not support
 * is the dishonesty the product exists to prevent. These tests pin the
 * transcript contract:
 *   - the correction is a user turn carrying the user's words verbatim,
 *   - the corrected transcript = the original + exactly one appended turn
 *     (no mutation, no truncation - what regenerates is what would later commit).
 */
describe('anonymous correction transcript contract', () => {
  it('builds a user turn carrying the correction verbatim', () => {
    const t = buildCorrectionTurn('The deadline is not May - it is March 1')
    expect(t.role).toBe('user')
    expect(t.content).toContain('The deadline is not May - it is March 1')
    expect(t.content.startsWith(CORRECTION_PREFIX)).toBe(true)
    // The turn asks the model to update its read - regeneration, not patching.
    expect(t.content).toContain('update your read')
  })

  it('appends exactly one turn and never mutates or truncates the original', () => {
    const original = [
      { role: 'assistant', content: 'Tell me about the project.' },
      { role: 'user', content: 'We ship in May.' },
    ]
    const snapshot = JSON.parse(JSON.stringify(original))
    const corrected = withCorrection(original, 'We ship March 1, not May')

    expect(corrected).toHaveLength(original.length + 1)
    expect(corrected.slice(0, original.length)).toEqual(snapshot) // prefix intact
    expect(original).toEqual(snapshot) // no mutation
    expect(corrected).not.toBe(original) // new array
    expect(isCorrectionTurn(corrected[corrected.length - 1])).toBe(true)
  })

  it('corrections accumulate: a second correction preserves the first', () => {
    const h0 = [{ role: 'user', content: 'We ship in May.' }]
    const h1 = withCorrection(h0, 'first fix')
    const h2 = withCorrection(h1, 'second fix')
    expect(h2.filter(isCorrectionTurn)).toHaveLength(2)
    expect(h2[1].content).toContain('first fix')
    expect(h2[2].content).toContain('second fix')
  })

  it('isCorrectionTurn does not false-positive on normal turns', () => {
    expect(isCorrectionTurn({ role: 'user', content: 'I want to correct the team on this.' })).toBe(false)
    expect(isCorrectionTurn({ role: 'assistant', content: `${CORRECTION_PREFIX} echoed` })).toBe(false)
  })
})
