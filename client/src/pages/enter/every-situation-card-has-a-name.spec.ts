import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * EVERY SITUATION CARD SAYS WHAT IT IS, AND NO CONTROL SITS INSIDE ANOTHER.
 *
 * OBSERVED WHILE DRIVING THE PAGE. Read back through the accessibility tree, all eighteen situation
 * cards came out as unnamed buttons - `button [ref_55]` - and the only named thing in each group was
 * the small "i" beside them: "What A pulse check covers". Somebody on a screen reader met eighteen
 * buttons called nothing, on the screen where the whole product starts.
 *
 * THE CAUSE WAS A CONTROL INSIDE A CONTROL. The card WAS the button, and the info affordance was a
 * role="button" nested in it. That is invalid, and it makes the outer control's name unreliable.
 *
 * THE FIX KEEPS THE LAYOUT AND SPLITS THE CONTROLS. The card is a plain div. The choice is a button
 * covering it at inset 0, underneath the content. The info is a real button above both. Two siblings,
 * neither inside the other - and because the content still lays out exactly as it did, nothing moved
 * on screen.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PAGE = readFileSync(path.join(__dirname, 'EntryChatPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

/** Just the situation-card block, so nothing elsewhere on this large page can satisfy these. */
const CARD = (() => {
  const start = PAGE.indexOf('{cards.map(card => (')
  expect(start).toBeGreaterThan(-1)
  /** Ends where the map does. Bounded so nothing elsewhere on this large page can satisfy these. */
  const end = PAGE.indexOf('gridTemplateColumns', start)
  expect(end).toBeGreaterThan(start)
  return PAGE.slice(start, end)
})()

describe('every situation card has a name', () => {
  it('the choice is a button named by the card label', () => {
    expect(CARD).toContain('aria-label={card.label}')
  })

  /**
   * The name has to come from the same field the card DISPLAYS, or the two drift and a screen reader
   * announces something nobody can see on screen.
   */
  it('and it is the label shown on the card, not a second copy of the text', () => {
    expect(CARD).toContain('>{card.label}</div>')
  })

  it('the info affordance is a real button, not a span pretending to be one', () => {
    expect(CARD).not.toContain('role="button"')
    expect(CARD).toContain('aria-label={`What ${card.label} covers`}')
  })

  /**
   * The covering button only works while it is BEHIND the content and the content does not eat its
   * clicks. Lose either and the card stops being clickable on its own title.
   */
  it('the covering button sits under content that lets clicks through', () => {
    expect(CARD).toMatch(/position: 'absolute', inset: 0, zIndex: 0/)
    expect(CARD).toMatch(/pointerEvents: 'none'/)
  })

  /** ...except the one thing that does take clicks. */
  it('and the info button takes its own clicks back', () => {
    expect(CARD).toMatch(/pointerEvents: 'auto'/)
  })
})
