import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * GROUP 3'S REVIEW, BATCH A FAULT 6: THREE PLAIN-WORDING FAULTS ON THE CONTEXT TAB.
 *
 * "THE CONTEXT CHAT" was shouted in capitals (textTransform: uppercase, which the reader sees the
 * same as typed capitals); "Say it, paste it, or attach it: what lands here..." and "It is not your
 * check-in: the report is written from check-ins..." each joined two sentences with a colon.
 */
const CHAT = readFileSync(join(__dirname, 'ContextChat.tsx'), 'utf8')
const PAGE = readFileSync(join(__dirname, 'ContextPage.tsx'), 'utf8')

describe('the context chat does not shout, and does not join sentences with a colon', () => {
  it('no longer sets the heading in capitals', () => {
    expect(CHAT).not.toMatch(/textTransform:\s*'uppercase'/)
  })

  it('uses the prototype\'s own heading for this box (B2-context, context.txt)', () => {
    expect(CHAT).toContain('Tell Groundwork how this team works')
  })

  it('says "Say it, paste it, or attach it." as its own sentence', () => {
    expect(CHAT).toContain('Say it, paste it, or attach it. What lands here guides every check-in and the coaching.')
  })

  it('says "It is not your check-in." as its own sentence, on the Context page', () => {
    expect(PAGE).toContain('It is not your check-in. The report is written from check-ins')
  })
})
