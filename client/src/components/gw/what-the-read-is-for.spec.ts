import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * "I DON'T GET WHAT THIS LONG TEXT ON THE CONTEXT CHAT IS FOR."
 *
 * The block states what the check-in can answer and then what it cannot, and stopped there - so it
 * read as the product listing its own shortcomings at somebody who had just arrived. Every "cannot"
 * line already named the thing that would fix it; what was missing was any route from reading one
 * to doing something about it.
 *
 * As of the same pass, the conversation directly below takes all of them - a change, more of what
 * success looks like, a goal, a list of things to be done, a document. Saying so turns a list of
 * faults into a list of next moves, which is what it was always meant to be.
 *
 * AND IT ONLY SAYS IT WHERE IT IS TRUE. The conversation is the lead's, and only when context is
 * on. Pointing a participant at a chat that is not on their page would be the same defect the rest
 * of this page has been cleared of twice.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
const READ = strip(readFileSync(join(__dirname, 'ContextStrength.tsx'), 'utf8'))
const PAGE = strip(readFileSync(join(__dirname, 'ContextPage.tsx'), 'utf8'))

describe('the "what this can tell you" read', () => {
  it('says what the list is for, where the conversation is below it', () => {
    expect(READ).toContain('the conversation below takes any of them')
  })

  it('and does not say it to somebody who has no conversation below', () => {
    expect(READ).toContain("chatBelow\n")
    expect(READ).toMatch(/\{chatBelow\s*\?/)
    expect(READ).toContain('It cannot do these yet, and each one names what is missing:')
  })

  it('and the page decides that from the same two facts the chat is gated on', () => {
    expect(PAGE).toContain('chatBelow={contextEnabled && isLead}')
    expect(PAGE).toContain('{contextEnabled && isLead && <ContextChat')
  })
})
