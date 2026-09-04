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
 */
const read = (f: string) => readFileSync(join(__dirname, f), 'utf8')
const PEOPLE = read('OrgMembersPage.tsx')
const CONNECT = read('IntegrationsPage.tsx')

describe('the admin pages are one shape', () => {
  it('reads the real files, so an empty one cannot pass', () => {
    expect(PEOPLE.length).toBeGreaterThan(3000)
    expect(CONNECT.length).toBeGreaterThan(3000)
  })

  it('People is 860 wide, like Connect', () => {
    expect(PEOPLE).toMatch(/maxWidth: 860/)
    expect(CONNECT).toMatch(/maxWidth: 860/)
  })

  it('and centred, which is the half that made it look broken', () => {
    /* 720 vs 860 is 140px. No auto margin is the whole right-hand side. */
    expect(PEOPLE).toMatch(/maxWidth: 860, margin: '0 auto'/)
  })

  it('and it has not gone back to its own number', () => {
    expect(PEOPLE).not.toMatch(/maxWidth: 720/)
  })
})
