import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * HOW CHECK-INS WORK HERE, ON THE PAGE WHERE AN ADMIN CHANGES IT.
 *
 * "Named leads can open a check-in and get approval. Other people that are not named can't, they
 * can just be part of a check-in. But you can disable these two settings."
 *
 * U.4 moved both settings from Settings to the People page, where the prototype keeps them
 * ("Who can open a check-in", A4 people.txt), with the prototype's words: "Only the people you
 * name", "Anybody signed in here". The promises are the same, checked in the new place; the
 * rendered page is checked in InvitePeople.spec.tsx.
 */
const code = readFileSync(join(__dirname, 'WhoCanOpenACheckIn.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ')
const SETTINGS = readFileSync(join(__dirname, '..', 'settings', 'SettingsPage.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ')

describe('the two settings are two controls', () => {
  it('offers both ways of answering who may open one', () => {
    expect(code).toContain("'NAMED_LEADS', 'Only the people you name'")
    expect(code).toContain("'EVERYONE', 'Anybody signed in here'")
  })

  it('says the thing people will otherwise ask: taking part is not affected', () => {
    expect(code).toContain('Everybody else takes part.')
    expect(code).toContain('Everyone else takes part in the ones they’re invited to.')
  })

  it('turns waiting on and off separately', () => {
    expect(code).toContain('set.mutate({ needsApproval: !how.needsApproval })')
    expect(code).toContain('Each new check-in waits for an admin before invitations go out.')
  })
})

describe('what it shows before it knows', () => {
  it('falls back to the stricter of each, never to the permissive one', () => {
    expect(code).toContain("{ whoMayOpen: 'NAMED_LEADS', needsApproval: true }")
  })
})

describe('one endpoint, so the page and the rule cannot disagree', () => {
  it('reads and writes the same place, from one page only', () => {
    expect(code).toContain("apiClient.get('/users/organization/check-ins')")
    expect(code.match(/apiClient\.patch\('\/users\/organization\/check-ins'/g)).toHaveLength(1)
    /* Settings no longer holds a second writer that could race this one. */
    expect(SETTINGS).not.toContain('/users/organization/check-ins')
  })
})
