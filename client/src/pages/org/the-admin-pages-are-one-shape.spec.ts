import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * TWO ADMIN PAGES, TWO DIFFERENT SHAPES.
 *
 * Measured side by side in the running product at 1280 wide:
 *
 *   Connect   860, centred          balanced gutters
 *   People    720, left-aligned     sat against the rail, right-hand side empty
 *
 * Neither number was chosen; they were written months apart. Connect's is kept.
 *
 * WHAT IS DELIBERATELY LEFT ALONE, because "make them all the same" would be worse:
 *   - Settings and Billing are 520. That is a single-column form, which is a reason.
 *   - The check-in list is 1160. It is a working surface and it was widened on purpose - the
 *     branch this lands on is called `fix/the-dashboard-uses-the-screen`.
 *
 * AND A CORRECTION TO MY OWN EARLIER MEASUREMENT. An earlier commit in this branch reported "three
 * page widths, 1194 unconstrained on the check-in list, settings and billing". That was measured on
 * `main`'s first child, which for Settings and Billing is an unconstrained wrapper around a
 * constrained column. Measured on the column that actually holds the content there are five widths,
 * and only one pair genuinely disagreed.
 *
 * UPDATED (design-audit.md section 3, "People", item 1): the centred-860 shape this file used to
 * pin on People was itself the defect - the prototype's content starts 48px right of the sidebar (at
 * 304px) and is 1088px wide, left-aligned, never centred. People is now rebuilt from the shared
 * `Page` frame (components/gw/ui), which gives it that width.
 *
 * UPDATED AGAIN (30 September, group 1's last page): Connect ("Connect your own tools", the old
 * IntegrationsPage.tsx) is now rebuilt from the same shared `Page` frame too, so it is no longer the
 * odd one out kept at its own 860-centred width - it shares People's shape on purpose, the way every
 * other rebuilt page already does.
 */
const read = (f: string) => readFileSync(join(__dirname, f), 'utf8')
const PEOPLE = read('OrgMembersPage.tsx')
const CONNECT = read('IntegrationsPage.tsx')

describe('the admin pages', () => {
  it('reads the real files, so an empty one cannot pass', () => {
    expect(PEOPLE.length).toBeGreaterThan(3000)
    expect(CONNECT.length).toBeGreaterThan(3000)
  })

  it('Connect is rebuilt from the shared Page frame too, not its own old centred-860 shape', () => {
    expect(CONNECT).toMatch(/from '@\/components\/gw\/ui'/)
    expect(CONNECT).toMatch(/<Page>/)
    expect(CONNECT).not.toMatch(/maxWidth: 860/)
  })

  it('People is rebuilt from the shared Page frame, 1088px wide and left-aligned, not the old centred column', () => {
    expect(PEOPLE).toMatch(/from '@\/components\/gw\/ui'/)
    expect(PEOPLE).toMatch(/<Page>/)
    expect(PEOPLE).not.toMatch(/maxWidth: 860/)
    expect(PEOPLE).not.toMatch(/maxWidth: 720/)
  })
})
