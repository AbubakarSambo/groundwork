/**
 * "ll check-ins" IS NOT A TRUNCATED LABEL, IT IS A DIFFERENT ONE.
 *
 * Measured in the running app at 320px, not read off the source:
 *
 *   six items (our own platform-admin bar): cells 53px, "All check-ins" 64px, starts at x = -5
 *   five items (a customer's bar):          cells 64px, "All check-ins" 64px, flush and over
 *
 * The bar already had a rule for this from an earlier fix - nowrap with ellipsis, so a long name
 * "degrades to 'Platform o...' rather than to a broken word". The ellipsis never appeared. The cell
 * is a column flex with `alignItems: center`, so an over-wide label overflows EQUALLY ON BOTH SIDES
 * and is clipped at the START, and `text-overflow` only ever trims the end. The earlier rule was
 * written when there were five items; a sixth arrived and took 11px off every cell.
 *
 * Type size was tried first and measured: at 9px the label is still 4.8px over, at 8.5px still 2px
 * over, and padding makes no difference because the cells are `flex: 1`. 8.5px is not a size to ask
 * a thumb to read, so there is no font at which this fits.
 *
 * What is left is fewer characters, in the bar only. "All" was doing work in the rail, where the
 * page it points at holds the check-ins the rail does not show - and no work at all in a 10px label
 * on a phone. Verified after: 0 clipped labels at 375px in both views, and the customer's bar is
 * clear at 320px too. Our own six-item bar still trims "Check-ins" by a few pixels at 320px, which
 * is where this stops: the alternative is contorting a customer-facing label for our own console.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const source = readFileSync(join(__dirname, 'AppShell.tsx'), 'utf8')
const stripped = source.replace(/\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\}|\/\/[^\n]*/g, '')

describe('the bottom bar on a phone', () => {
  it('has a short name for the two labels that did not fit', () => {
    expect(stripped).toMatch(/label: 'All check-ins',[\s\S]{0,80}short: 'Check-ins'/)
    expect(stripped).toMatch(/label: 'Platform ops',[\s\S]{0,80}short: 'Ops'/)
  })

  it('and the compact item actually uses it, which is the whole wire', () => {
    /* The bottom bar's item has its own function now that the desktop sidebar draws its own doors. */
    const start = stripped.indexOf('function BottomBarItem')
    const compact = stripped.slice(start, stripped.indexOf('</NavLink>', start))
    expect(start).toBeGreaterThan(-1)
    expect(compact).toMatch(/short \?\? item\.label/)
  })

  it('while the desktop rail still says the full thing', () => {
    /* Two readers, two widths. The rail has the room and "All" earns its place there. */
    const rail = stripped.slice(stripped.indexOf('export function AppSidebar'), stripped.indexOf('<nav', stripped.indexOf('className="gw-rl-foot"')))
    expect(rail).toContain('{item.label}')
    expect(rail).not.toMatch(/short \?\?/)
  })

  it('keeps the nowrap-and-ellipsis backstop from the earlier fix', () => {
    /* It could not save this one, but it is still what stops a future long name breaking mid-word. */
    expect(stripped).toMatch(/whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'/)
  })
})
