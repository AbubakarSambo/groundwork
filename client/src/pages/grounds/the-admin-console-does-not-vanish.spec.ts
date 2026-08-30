import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE SCREEN AN ORG ADMIN LANDS ON.
 *
 * Bounded slices throughout: guards on these pages have passed against deliberately broken copy
 * three times in this repository because they read the whole file, where every word they wanted
 * appeared somewhere else.
 */
const CARD = readFileSync(join(__dirname, 'an-admin-lands-on-a-check-in-list.tsx'), 'utf8')
const LIST = readFileSync(join(__dirname, 'GroundsListPage.tsx'), 'utf8')

describe('it stays past the first check-in', () => {
  it('is not mounted inside the empty-list branch any more', () => {
    /* It used to hide the moment somebody opened a check-in, which is step two of five. */
    const mount = LIST.slice(LIST.indexOf('<AdminFirstRun />') - 400, LIST.indexOf('<AdminFirstRun />'))
    expect(mount).not.toContain('grounds.length === 0')
  })

  it('decides for itself when it is finished, and goes then', () => {
    expect(CARD).toContain('if (!data || finished) return null')
  })
})

describe('what it shows', () => {
  it('counts the steps that count, and not the optional one', () => {
    const counting = CARD.slice(CARD.indexOf('const counted'), CARD.indexOf('if (!data'))
    expect(counting).toContain('steps.filter(s => !s.optional)')
  })

  it('does not introduce itself by quoting the card underneath it', () => {
    /* It printed the next step's own body three centimetres above the card printing it. */
    const intro = CARD.slice(CARD.indexOf('NOT THE NEXT STEP'), CARD.indexOf('<div style={{ display: \'grid\''))
    expect(intro).not.toContain('{next.body}')
    expect(intro).not.toContain('{next ? next.body')
  })

  it('marks the next thing to do rather than leaving five identical cards', () => {
    expect(CARD).toContain('const next = steps.find(s => !s.done && !s.optional)')
    expect(CARD).toContain("s === next ? 'var(--gw-navy)'")
  })
})

describe('one action, one button', () => {
  it('the third button for opening a check-in is gone', () => {
    /*
     * The rail says it, the panel above says it, and the empty state said it a third time.
     *
     * Comments stripped first: the note explaining the removal names the button it removed, and a
     * guard that cannot tell prose from a rendered button makes documenting a fix impossible.
     */
    const code = LIST.replace(/\/\*[\s\S]*?\*\//g, ' ')
    expect(code).not.toContain('Open your first check-in')
    /* The words stay: they say what a check-in is for. */
    expect(code).toContain('Open a check-in for a new hire')
  })
})
