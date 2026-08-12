import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * SWITCHING ORGANISATION IS NOT A STRAY CLICK. W8-71.
 *
 * The switcher rows sit in the rail directly above the profile block, and one click did all
 * of this with no confirmation:
 *
 *  - changed which organisation's data you can see
 *  - changed your ROLE, because a person can administer their own company and be an
 *    ordinary member of a client's
 *  - reloaded the whole app onto a different grounds list
 *
 * It happened to me while testing this branch. The result was "No grounds yet" in the rail
 * and "Member" under my name, which reads exactly like the product having lost everything -
 * and afterwards I could not tell whether I had mis-clicked or whether something had
 * switched me. I checked: nothing switches on load, on either page, across reloads. It was
 * a click, and it should not have been that easy.
 *
 * Checked as source: the value is that the confirm exists and names the role, and a jsdom
 * test of `window.confirm` proves the mock more than the product.
 */
const SRC = readFileSync(join(__dirname, 'AppShell.tsx'), 'utf8')
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the switcher asks first', () => {
  it('nothing switches without a confirm', () => {
    expect(CODE).toMatch(/if \(!window\.confirm\([\s\S]{0,200}\)\) return\s*\n\s*switchOrg\.mutate\(o\.id\)/)
  })

  it('and the confirm names the organisation and the role', () => {
    // The role change is the part nobody expects, so it is in the question.
    expect(CODE).toMatch(/Switch to \$\{o\.name\}\?/)
    expect(CODE).toMatch(/as a \$\{asRole\}/)
  })

  it('the active organisation is still not clickable', () => {
    // Confirming a switch to where you already are would be a dialogue that does nothing.
    expect(CODE).toMatch(/if \(o\.active \|\| switchOrg\.isPending\) return/)
  })

  it('and the switch still happens once confirmed', () => {
    // A guard that only ever blocks is a broken feature, not a safe one.
    expect(CODE).toContain('switchOrg.mutate(o.id)')
  })
})
