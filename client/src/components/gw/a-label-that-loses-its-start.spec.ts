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
  /*
   * REBUILT FOR A1 (layout-phone). The bar no longer draws the nav items with a short name each: it
   * has its own few fixed words - Check-ins, Start, More - and every other door is on "More". The
   * point of this file still holds, and is checked the new way: no label on the bar is long enough to
   * lose its start in a cell at 320px, and the nowrap-and-ellipsis backstop is still there.
   */
  it('says a few short words, each fitting a fifth of a 320px screen', () => {
    const bar = stripped.slice(stripped.indexOf('className="gw-sidebar-mobile"'), stripped.indexOf('</nav>', stripped.indexOf('className="gw-sidebar-mobile"')))
    const words = [...bar.matchAll(/<PhoneIcon d="[a-z]+" \/>([A-Za-z -]+)\n/g)].map(m => m[1].trim())
    /* U.5: Today came first when its page came, as layout-phone.txt has it. U.14: Chat came with
       its page, so the bar has the prototype's five words and each cell is a fifth, not a third.
       U.15: Company is in the source beside Start, because somebody who may not start a check-in
       has Company in its place (ask-on-a-phone.txt). Only one of the two is ever drawn. */
    expect(words).toEqual(['Today', 'Check-ins', 'Start', 'Company', 'Chat', 'More'])
    /* On a screen of 360px or less the words are 12px, about 6.9px a character bold, with no
       padding at the sides; a fifth of 320 is 64. */
    expect(readFileSync(join(__dirname, '..', '..', 'index.css'), 'utf8')).toMatch(/@media \(max-width: 360px\) \{ \.gw-phone-bar-item \{ font-size: 12px; padding: 6px 0; \} \}/)
    for (const w of words) expect(w.length * 6.9).toBeLessThan(320 / 5)
  })

  it('and no nav item keeps a second, short name any more', () => {
    expect(stripped).not.toMatch(/short: '/)
  })

  it('while the desktop rail still says the full thing', () => {
    const rail = stripped.slice(stripped.indexOf('export function AppSidebar'), stripped.indexOf('<nav', stripped.indexOf('className="gw-rl-foot"')))
    expect(rail).toContain('{item.label}')
  })

  it('keeps the nowrap-and-ellipsis backstop from the earlier fix', () => {
    const CSS = readFileSync(join(__dirname, '../../index.css'), 'utf8')
    expect(CSS).toMatch(/\.gw-phone-bar-item \{[^}]*white-space: nowrap; overflow: hidden; text-overflow: ellipsis;/)
  })
})
