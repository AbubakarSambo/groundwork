import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * HOW CHECK-INS WORK HERE, ON THE PAGE WHERE AN ADMIN CHANGES IT.
 *
 * "Named leads can open a check-in and get approval. Other people that are not named can't, they
 * can just be part of a check-in. But you can disable these two settings."
 *
 * Bounded slices: guards on these pages have passed against deliberately broken copy four times in
 * this repository, every one of them because they read a whole file where the words they wanted
 * appeared somewhere else.
 */
const PAGE = readFileSync(join(__dirname, 'SettingsPage.tsx'), 'utf8')
const code = PAGE.replace(/\/\*[\s\S]*?\*\//g, ' ')
const WHO = code.slice(code.indexOf('Who can open a check-in'), code.indexOf('Check-ins wait for an admin'))
const WAIT = code.slice(code.indexOf('Check-ins wait for an admin'), code.indexOf('</section>', code.indexOf('Check-ins wait for an admin')))

describe('the two settings are two controls', () => {
  it('offers both ways of answering who may open one', () => {
    expect(WHO).toContain("'NAMED_LEADS'")
    expect(WHO).toContain("'EVERYONE'")
    expect(WHO).toContain('Only people I name')
    expect(WHO).toContain('Anybody here')
  })

  it('says the thing people will otherwise ask: taking part is not affected', () => {
    /* Somebody who cannot open one is not shut out of anything. Saying so here stops an admin
       reading this control as "who can use Groundwork". */
    expect(WHO).toContain('take part in a check-in somebody adds them to')
  })

  it('turns waiting on and off separately', () => {
    expect(WAIT).toContain('needsApproval: !howCheckIns.needsApproval')
    expect(WAIT).toContain('starts\n                    the moment somebody opens it')
  })
})

describe('what it shows before it knows', () => {
  it('falls back to the stricter of each, never to the permissive one', () => {
    /*
     * A toggle rendering "off" while the server says "on" is worse than a spinner: an admin reads
     * it, believes approval is off, and finds out otherwise from a check-in nobody accepted.
     */
    expect(code).toContain("{ whoMayOpen: 'NAMED_LEADS', needsApproval: true }")
  })

  it('is admin-only, like the rename above it', () => {
    const section = code.slice(code.lastIndexOf("user?.role === 'ADMIN'", code.indexOf('Who can open a check-in')), code.indexOf('Who can open a check-in'))
    expect(section).toContain('ADMIN')
  })
})

describe('one endpoint, so the page and the rule cannot disagree', () => {
  it('reads and writes the same place', () => {
    expect(code).toContain("apiClient.get('/users/organization/check-ins')")
    expect(code).toContain("apiClient.patch('/users/organization/check-ins', change)")
    /* One writer. Two would let the radio and the toggle race each other. */
    expect(code.match(/apiClient\.patch\('\/users\/organization\/check-ins'/g)).toHaveLength(1)
  })
})
