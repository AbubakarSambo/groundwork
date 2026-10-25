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
 * And Settings was in no rail at all. It lived in the user block at the bottom of the check-ins list, so
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
const lead = { role: 'LEAD' }
const platform = { role: 'ADMIN', isPlatformAdmin: true }
const labels = (u: any) => navItemsFor(u).map(i => i.label)
/* U.5: Today is everybody's, first of the pages. These lists gained it when the page came.
   U.12: so is You, straight after Today, as layout-computer.txt draws it.
   U.15: Company sits between them, for everybody in the organisation but a guest from another
   company. Signed out (null), there is no organisation, so no Company.
   U.17: Suites, for an admin under the organisation's name between Connections and Plan and
   billing, and for a lead after You, as the prototype draws each. A member has none. */

describe('who sees what', () => {
  it('an admin sees the organisation\'s pages', () => {
    // The design system's names for the organisation's pages: People, Connections, Plan and billing.
    expect(labels(admin)).toEqual(['Today', 'Company', 'You', 'All check-ins', 'Boards', 'People', 'Connections', 'Suites', 'Plan and billing', 'Settings'])
  })

  it('a lead gets the boards door and nothing else that is the org\'s', () => {
    /*
      A lead oversees a department's check-ins, so the one page across several is theirs. People,
      Connect and Billing are the organisation's and would bounce them.
    */
    expect(labels(lead)).toEqual(['Today', 'Company', 'You', 'Suites', 'All check-ins', 'Boards', 'Settings'])
  })

  /*
   * HAFSAH, 10 OCTOBER (B-146): A MEMBER NOW HAS "BOARDS" TOO. The second deep page audit found
   * /boards already worked for a member - the server already scopes it to what they take part in
   * - but there was no door to it in her rail or her More menu. This used to pin that gap; it now
   * reads with the door this reader was missing.
   */
  it('a team member sees the check-ins, Boards and their own settings, and nothing that would bounce them', () => {
    expect(labels(member)).toEqual(['Today', 'Company', 'You', 'All check-ins', 'Boards', 'Settings'])
  })

  it('a guest from another company is not offered this organisation\'s Company page', () => {
    expect(labels({ role: 'GUEST' })).not.toContain('Company')
  })

  it('Suites goes to the one Suites page, and only for an admin or a lead', () => {
    for (const u of [admin, lead]) expect(navItemsFor(u).filter(i => i.label === 'Suites').map(i => i.to)).toEqual(['/settings/suites'])
    for (const u of [member, { role: 'GUEST' }, null]) expect(labels(u)).not.toContain('Suites')
  })

  /**
   * LIVE WALK AT A HUNDRED PEOPLE, FAULT 1: `finance.m1` and `procurement.m1` decide requests every
   * day - the approver's queue serves them something - but were role `MEMBER`, so the gate above left
   * them with no door to the suites at all. The same quiet queue count `QueueLink` already reads now
   * also opens the door, only for whoever it is actually serving something to; a member it serves
   * nothing to, and everybody who already has it by role, is unaffected.
   */
  it('a member the queue serves something to also gets the door to Suites', () => {
    expect(navItemsFor(member, { queueServesThem: true }).filter(i => i.label === 'Suites').map(i => i.to)).toEqual(['/settings/suites'])
    expect(navItemsFor(member, { queueServesThem: false }).map(i => i.label)).not.toContain('Suites')
    expect(labels(member)).not.toContain('Suites')
  })

  it('the platform back-office is for Groundwork, not for an org admin', () => {
    /**
     * `/admin/dashboard` is wrapped in `RequirePlatformAdmin`, so showing it to an org admin was a
     * door that bounced them straight back to /grounds.
     */
    expect(labels(admin)).not.toContain('Platform ops')
    expect(labels(platform)).toContain('Platform ops')
  })

  it('and somebody not signed in is not offered anything admin-shaped', () => {
    expect(labels(null)).toEqual(['Today', 'You', 'All check-ins', 'Settings'])
  })
})

describe('one gate, used by all three renderers', () => {
  it('the collapsed rail, the expanded rail and the phone\'s "More" page all call it', () => {
    // The bug was three copies of the rule. This is the check that there is one.
    // The phone's doors moved from the bottom bar to "More" (A1), so the third caller is that page.
    const MORE = readFileSync(join(__dirname, '../../pages/more/MorePage.tsx'), 'utf8')
    /* Both of AppShell's own calls now also pass `navOpts` (fault 1 of the live walk at a hundred
       people: a member the approver's queue serves something to gets the same door to Suites a lead
       or an admin already has), so the pattern allows an optional second argument. */
    expect((SHELL.match(/navItemsFor\(user(?:, navOpts)?\)/g) ?? []).length).toBe(2)
    expect((MORE.match(/navItemsFor\(user\)/g) ?? []).length).toBe(1)
    expect(MORE).not.toMatch(/NAV_ITEMS/)
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
    expect(ORG_ROUTES).toEqual(['/org/members', '/settings/connections', '/settings/whatsapp', '/settings/tools', '/billing', '/settings'])
  })

  it('the heading is the organisation\'s own name, never a placeholder standing in for it', () => {
    /*
     * U.8 REVIEW: "Your organisation" read as if it were the real name, on a placeholder profile a
     * join link can leave standing before the real one arrives (JoinConfirmPage.tsx). Now nothing
     * is shown until `organizationName` actually arrives, rather than a name that was never true.
     */
    expect(SHELL).toMatch(/user\?\.organizationName \?\? ''/)
    expect(SHELL).not.toMatch(/\?\? 'Your organisation'/)
  })

  it('and it only appears when there is a group to head', () => {
    /**
     * A team member sees Settings and nothing else from that list, and their settings are their own -
     * notifications, their WhatsApp number, what we hold about them. The company's name above it
     * would be wrong about whose page it is.
     *
     * Settings now lives in the person's own menu ("Your settings"), so the group under the
     * organisation's name is exactly the admin-only pages, and it is drawn only when there are some.
     */
    /* Less what is in the organisation menu now (Hafsah, 25 October). */
    expect(SHELL).toMatch(/const adminItems = items\.filter\(i => \(i as any\)\.adminOnly && !IN_THE_ORG_MENU\.includes\(i\.to\)\)/)
    expect(SHELL).toMatch(/\{adminItems\.length > 0 && \(/)
  })
})
