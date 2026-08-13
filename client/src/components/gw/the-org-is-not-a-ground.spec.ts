import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { navItemsFor, ORG_ROUTES } from './AppShell'

/**
 * THE ORGANISATION'S PAGES, GROUPED AND CORRECTLY GATED.
 *
 * Her words: "billing and settings for the org should have its own accessibility at the very top for
 * the admin or somewhere else. What if the admin is also a participant or lead."
 *
 * THREE RENDERERS, THREE DIFFERENT ANSWERS, and one of them was backwards:
 *
 *   collapsed rail   `!item.adminOnly || user?.role === 'ADMIN'`   right
 *   expanded rail    `!item.adminOnly`                             an ADMIN saw no People, no Billing
 *   mobile bar       no filter at all                              everybody saw both
 *
 * So an admin on a desktop could not reach billing from the rail - the one person it is for - while a
 * team member on a phone had two doors that would bounce them. Measured on the running app before the
 * fix: the admin's expanded rail contained "Grounds" and nothing else.
 *
 * And Settings was in no rail at all. It lived in the user block at the bottom of the grounds list, so
 * the organisation's name - the thing every page shows the team - could be changed from one page and
 * nowhere else.
 *
 * HER QUESTION ABOUT HOLDING TWO PARTS AT ONCE is why this is a heading in the rail rather than a
 * separate bar: what somebody can do for the ORGANISATION does not change with the part they hold on
 * any ground. An admin who is also a lead and a party sees this section unchanged, and their part in a
 * ground decides only what that ground's tabs contain.
 */
const SHELL = readFileSync(join(__dirname, 'AppShell.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const admin = { role: 'ADMIN' }
const member = { role: 'MEMBER' }
const platform = { role: 'ADMIN', isPlatformAdmin: true }
const labels = (u: any) => navItemsFor(u).map(i => i.label)

describe('who sees what', () => {
  it('an admin sees the organisation\'s pages', () => {
    // Verified rendered: Grounds, then the org name, then People, Billing, Settings.
    expect(labels(admin)).toEqual(['Grounds', 'People', 'Billing', 'Settings'])
  })

  it('a team member sees the grounds and their own settings, and nothing that would bounce them', () => {
    expect(labels(member)).toEqual(['Grounds', 'Settings'])
  })

  it('the platform back-office is for Groundwork, not for an org admin', () => {
    /**
     * `/admin/dashboard` is wrapped in `RequirePlatformAdmin`, so showing it to an org admin was a
     * door that bounced them straight back to /grounds.
     */
    expect(labels(admin)).not.toContain('Admin')
    expect(labels(platform)).toContain('Admin')
  })

  it('and somebody not signed in is not offered anything admin-shaped', () => {
    expect(labels(null)).toEqual(['Grounds', 'Settings'])
  })
})

describe('one gate, used by all three renderers', () => {
  it('the collapsed rail, the expanded rail and the mobile bar all call it', () => {
    // The bug was three copies of the rule. This is the check that there is one.
    expect((SHELL.match(/navItemsFor\(user\)/g) ?? []).length).toBe(3)
  })

  it('and none of them filters on its own', () => {
    /**
     * Scoped past `navItemsFor`'s own body, which is the one place a filter belongs. Asserting on the
     * whole file failed against the correct code - the helper contains the only legitimate
     * `NAV_ITEMS.filter` there is.
     */
    const renderers = SHELL.slice(SHELL.indexOf('type FbTab'))
    expect(renderers).not.toMatch(/NAV_ITEMS\.filter/)
    expect(renderers).not.toMatch(/\{NAV_ITEMS\.map/)
  })
})

describe('the group reads as a place', () => {
  it('the org routes are named in one list', () => {
    expect(ORG_ROUTES).toEqual(['/org/members', '/billing', '/settings'])
  })

  it('the heading is the organisation\'s own name', () => {
    expect(SHELL).toMatch(/user\?\.organizationName \?\? 'Your organisation'/)
  })

  it('and it only appears when there is a group to head', () => {
    /**
     * A team member sees Settings and nothing else from that list, and their settings are their own -
     * notifications, their WhatsApp number, what we hold about them. The company's name above it
     * would be wrong about whose page it is. Verified rendered: the member's rail has no heading.
     */
    expect(SHELL).toMatch(/orgCount > 1/)
  })
})
