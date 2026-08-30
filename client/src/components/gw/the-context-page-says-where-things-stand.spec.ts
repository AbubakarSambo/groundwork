import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE PAGE SOMEBODY OPENS BEFORE A CONVERSATION.
 *
 * It listed what was agreed and could not say whether any of it had happened - so it read as a list
 * of sentences rather than as the record you return to when reality starts happening.
 *
 * Bounded slices. Guards on these pages have passed against deliberately broken copy several times
 * in this repository, every one of them because they read a whole file.
 */
const PANEL = readFileSync(join(__dirname, 'ExpectationsPanel.tsx'), 'utf8')
const PAGE = readFileSync(join(__dirname, 'ContextPage.tsx'), 'utf8')
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

describe('each promise says where it stands', () => {
  const code = strip(PANEL)

  it('reads the one rule, rather than working it out on the page', () => {
    expect(code).toContain('whereItStands(o, new Date())')
  })

  it('and carries the fields that rule needs', () => {
    /* Both were added to the row and neither reached this panel, so it could show the words
       somebody used for a deadline and never whether that date had passed. */
    expect(PANEL).toContain('dueDate?: string | null')
    expect(PANEL).toContain('status?: string | null')
  })

  it('marks a passed date without shouting about it', () => {
    const near = code.slice(code.indexOf('whereItStands(o, new Date())'))
    expect(near).toContain("stand.tone === 'late' ? 'var(--gw-amber-t)'")
    /* Amber, not red. It is a fact about a calendar, not a verdict on a person. */
    expect(near).not.toContain('var(--gw-red')
  })
})

describe('the line before the list', () => {
  const code = strip(PAGE)

  it('counts what is outstanding across everybody', () => {
    expect(code).toContain('whatIsOutstanding(all, new Date())')
  })

  it('shows nothing when there is nothing to say', () => {
    expect(code).toContain('if (!line || !isLead) return null')
  })

  it('and is for the lead, who is the one preparing the conversation', () => {
    /* A participant opening their own record does not need a summary of everybody else's. */
    expect(code).toContain('!isLead')
  })
})
