import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE TARGET IS NOT THE GLYPH.
 *
 * Measured at tablet width in the running product, 32 of 39 controls on the check-in list were
 * under 44x44. Most of that is a dense rail whose rows are 223x35 by design, and a row that size is
 * comfortably hittable. Two were not:
 *
 *   the rename pencil    14 x 11
 *   the rail collapse    17 x 25
 *
 * The pencil is the worse of the two because it sits INSIDE the row's link, so a miss does not do
 * nothing - it navigates. A small mark you must hit exactly, next to something that takes you away
 * if you do not.
 *
 * Both are fixed with a pseudo-element rather than padding, so nothing in the rail moves. They are
 * NOT fixed the same way, and the difference is the point: the collapse button stands alone and can
 * take the full 44x44, while the pencil is widened to 44 but held to the row's own height. A 45px
 * target inside a 35px row reaches into the rows above and below, and stealing a tap for a
 * different check-in is a worse bug than the one being fixed.
 *
 * And the pencil was hover-revealed: 0.42 at rest, brightening when the row is hovered. A touch
 * screen never sends hover, so on exactly the devices where it is hardest to hit, it also sat at
 * its faintest - the state that means "not yet".
 *
 * Verified in the browser: the pencil's tappable box now answers 14px either side and 11px above
 * and below and stops there, tapping the row's label still reaches the link, the collapse button
 * answers 20px in every direction and not 30, and on an emulated touch device `(hover: none)`
 * matches and the pencil computes 0.85.
 */
const CSS = readFileSync(join(__dirname, '../../index.css'), 'utf8')
const SHELL = readFileSync(join(__dirname, 'AppShell.tsx'), 'utf8')

describe('an icon is not a target', () => {
  it('reads the real files, so an empty one cannot pass', () => {
    expect(CSS.length).toBeGreaterThan(10000)
    expect(SHELL.length).toBeGreaterThan(5000)
  })

  it('the pencil is a target of its own, not a glyph stretched over its neighbours', () => {
    /*
     * CHANGED WITH THE LIGHT SIDEBAR (A1). The pencil was a 14x11 glyph widened by an ::after
     * reaching 15px either side. Once the pin sat beside it, that reach covered the pin, and a tap on
     * the pin opened the rename box (found by the reviewer with elementFromPoint). The button itself
     * is now the target: 32 wide and the row's 36 tall, with no pseudo-element reaching past it.
     */
    expect(CSS).toMatch(/\.gw-rail-row \.gw-pin, \.gw-rail-row \.gw-rename \{[^}]*width: 32px; height: 36px;/)
    expect(CSS).not.toMatch(/\.gw-rename::after\s*\{/)
  })

  it('and it is held to the row, not spilling into the check-ins above and below', () => {
    /* The row is 36 tall; the pencil is exactly that, so it cannot steal a neighbour's tap. */
    const rule = CSS.match(/\.gw-rail-row \.gw-pin, \.gw-rail-row \.gw-rename \{([^}]*)\}/)![1]
    expect(rule).toMatch(/height: 36px/)
    expect(CSS).toMatch(/\.gw-ci-row \{[^}]*min-height: 36px/)
  })

  it('the pencil is visible on a device that cannot hover', () => {
    expect(CSS).toMatch(/@media \(hover: none\)\s*\{\s*\.gw-rename \{ opacity: 0\.85; \}/)
  })

  it('the standalone icon button gets a full 44 square', () => {
    expect(CSS).toMatch(/\.gw-tap44::after\s*\{[\s\S]*?width:\s*44px[\s\S]*?height:\s*44px/)
  })

  it('and the collapse button actually asks for it', () => {
    /* The rule existing is not the fix; something has to wear the class. */
    expect(SHELL).toMatch(/className="gw-tap44"[\s\S]{0,120}setCollapsed/)
  })
})
