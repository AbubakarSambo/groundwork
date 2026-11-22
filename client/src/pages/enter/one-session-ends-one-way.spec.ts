import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { sessionHasClosed } from './EntryChatPage'

/**
 * "HOW THE ENTRY CHAT CLOSES DEPENDS ON THE SESSION." Hafsah, from a live run.
 *
 * The rule for "this session is over" was written out twice in one file, with identical logic and
 * two different consequences:
 *
 *   the main chat        -> offer to close
 *   the correction loop  -> regenerate the report
 *
 * The consequences are legitimately different. The RULE is one thing, and two copies of a rule is
 * how a session comes to end differently depending on the path a person happened to take. Whoever
 * edits one copy has no reason to know about the other.
 */

describe('the server decides, and the phrase list is only a backstop', () => {
  it('the flag alone closes the session, whatever the words are', () => {
    expect(sessionHasClosed({ reply: 'Anything else on your mind?', sessionComplete: true })).toBe(true)
  })

  it('a closing phrase closes it when the flag is absent', () => {
    /**
     * Older server responses carry no flag at all, and those sessions still have to end. Using a
     * phrase that is actually in the list: my first version asserted "Understood. Your record is
     * here", which is what the live screenshot showed as the final message - and that session
     * closed on the FLAG, not the phrase. The test was wrong, not the list.
     */
    expect(sessionHasClosed({ reply: 'Good. Your check-in is complete.' })).toBe(true)
    expect(sessionHasClosed({ reply: 'That is now on record.' })).toBe(true)
  })

  it('an ordinary reply does not', () => {
    expect(sessionHasClosed({ reply: 'What would a "yes" look like in a way you could point to?' })).toBe(false)
    expect(sessionHasClosed({ reply: 'Got it. Setting a clear sales target for the quarter.' })).toBe(false)
  })

  it('a false flag does not close it, and does not silence the backstop either', () => {
    expect(sessionHasClosed({ reply: 'Tell me more.', sessionComplete: false })).toBe(false)
  })

  it('and it survives an empty or missing reply rather than throwing', () => {
    /** The report path calls this on a response that may have failed mid-flight. */
    expect(sessionHasClosed({ reply: '' })).toBe(false)
    expect(sessionHasClosed({ reply: undefined as any })).toBe(false)
  })
})

describe('there is exactly one copy of the rule', () => {
  const CODE = readFileSync(join(__dirname, 'EntryChatPage.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

  it('no path re-derives the close test inline', () => {
    /**
     * Comments stripped first: the function's own docblock quotes the old expression while
     * explaining why it went, and a guard a comment can satisfy is not a guard.
     */
    expect(CODE).not.toMatch(/SESSION_END_PATTERNS\.some\(p => replyLower\.includes\(p\)\)/)
    expect(CODE).not.toMatch(/const isNaturalClose =/)
  })

  it('both flows call the shared one', () => {
    /** The check-in's call site plus the definition. Fewer means the flow stopped closing at all. Changed 22 November 2026: the
        report's correction exchange, the second caller, went with the save card. */
    expect((CODE.match(/sessionHasClosed\(/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })

  it('the patterns list is still consulted, not quietly dropped', () => {
    expect(CODE).toMatch(/SESSION_END_PATTERNS\.some/)
  })
})
