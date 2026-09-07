import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * EVERY SITUATION CARD HAS A NAME, AND NOW THERE IS ONLY ONE CARD TO CHECK.
 *
 * This file used to read EntryChatPage.tsx, because the entry chat drew its own card. Driven through
 * the accessibility tree, all eighteen of them came back as unnamed buttons: the only named thing in
 * each group was the little "i" beside the title, so a screen reader gave you eighteen buttons called
 * nothing and one called "What A pulse check covers". The cause was a control nested inside a
 * control, which makes the outer one's name unreliable.
 *
 * The two pickers share one component now - see SituationCard.tsx - so this reads that instead, and
 * what it holds covers both doors at once rather than one of them.
 */
const CARD = readFileSync(join(__dirname, 'SituationCard.tsx'), 'utf8')
  /* A guard a comment satisfies is not a guard, and the doc comment above quotes several of these. */
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/^\s*\/\/.*$/gm, '')

describe('every situation card has a name', () => {
  it('is named by the label it displays, not a second copy of the text', () => {
    /* The name has to come from the same value the card shows, or the two drift and a screen reader
       announces something nobody can see. */
    expect(CARD).toMatch(/aria-label=\{`\$\{label\}\./)
    expect(CARD).toContain('>{label}</div>')
  })

  it('says whether it is chosen, which is the other half of a radio', () => {
    expect(CARD).toContain('aria-checked={selected}')
    expect(CARD).toContain('role="radio"')
  })

  it('is reachable and operable from the keyboard, not only by pointer', () => {
    expect(CARD).toMatch(/tabIndex=\{focusable \? 0 : -1\}/)
    expect(CARD).toMatch(/e\.key === ' ' \|\| e\.key === 'Enter'/)
  })

  it('has a real button for the disclosure, not a span pretending to be one', () => {
    expect(CARD).toContain('aria-expanded={expanded}')
    expect(CARD).not.toContain('role="button"')
  })

  it('and opening the disclosure does not pick the card', () => {
    /* Without the stopPropagation, reading what a situation involves chooses it - which on the entry
       chat sends a message and starts the conversation you were still deciding about. */
    expect(CARD).toMatch(/e\.stopPropagation\(\); onToggleExpanded\(\)/)
  })
})
