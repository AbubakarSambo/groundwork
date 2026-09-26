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
/*
 * U.3: THE CONFIRM BOX IS REPLACED, NOT REMOVED. The protection W8-71 asked for stays: one click in the
 * menu never switches. It opens the prototype's "Choose an organisation" page (#/orgs), whose every
 * row names the role you will have there, and the switch happens only when a row there is pressed.
 * The old assertions read the `window.confirm` call and its wording, which no longer exist.
 */
const SRC = readFileSync(join(__dirname, 'your-organisations.ts'), 'utf8')
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const PAGE = readFileSync(join(__dirname, '../../pages/org/OrgsPage.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('the switcher asks first', () => {
  it('one click in the menu never switches: it opens "Choose an organisation"', () => {
    expect(CODE).not.toMatch(/switchOrganization/)
    expect(CODE).toMatch(/navigate\('\/orgs'\)/)
  })

  it('and that page names the role on every row, before anything is pressed', () => {
    expect(PAGE).toMatch(/roleWord\(o\.role\)/)
  })

  it('the active organisation is still not switched to again', () => {
    expect(CODE).toMatch(/if \(o\.active\) return/)
  })

  it('and the switch still happens, from the page', () => {
    // A guard that only ever blocks is a broken feature, not a safe one.
    expect(PAGE).toContain('authApi.switchOrganization(organizationId)')
  })
})
