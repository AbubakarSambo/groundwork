import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const PAGE = strip(readFileSync(join(__dirname, 'AdminPage.tsx'), 'utf8'))
const API = strip(readFileSync(join(__dirname, '..', '..', 'api', 'prompts.ts'), 'utf8'))

/**
 * THE CONSOLE SAID "11 USERS" AND COULD NOT SAY WHO ONE OF THEM WAS.
 *
 * So support could not answer "did the invitation reach Musa" without asking the customer. The org
 * row opens now: names, addresses, phone numbers, and whether the address is verified.
 *
 * AND NOTHING ELSE. Not a check-in, not a record entry, not a report, not a line anybody wrote.
 * What we publish is that Groundwork staff have no way to read your check-ins, and that is held by
 * its own guard on the server; this is the account list, which is a different thing and is ours.
 */
describe('who is in an org, but never their words', () => {
  it('the row opens onto the people', () => {
    expect(PAGE).toContain('function PeopleInOrg')
    expect(PAGE).toContain('{open === org.id && <PeopleInOrg')
  })

  it('and shows what support actually needs to reach somebody', () => {
    const at = PAGE.indexOf('function PeopleInOrg')
    const fn = PAGE.slice(at, PAGE.indexOf('function OrgsTab'))
    expect(fn).toContain('mailto:')
    /* The phone, because somebody who joined over WhatsApp may never have given an address. */
    expect(fn).toContain('p.phoneNumber')
    /* Whether the address works is the first thing support needs and the easiest to miss. */
    expect(fn).toContain('isEmailVerified')
  })

  it('is fetched only when a row is opened', () => {
    /* Loading every organisation's roster to render a count moves a lot of somebody's data for
       nothing, and most of the time nobody is looking. */
    expect(PAGE).toContain("queryKey: ['org-people', organizationId]")
  })

  it('and the call asks for the account list, never the work', () => {
    const at = API.indexOf('peopleIn:')
    expect(at).toBeGreaterThan(-1)
    const call = API.slice(at, at + 700)
    for (const theirWork of ['checkIn', 'recordEntry', 'report', 'sharedPicture', 'text']) {
      expect(call).not.toContain(theirWork)
    }
    expect(call).toContain('/people')
  })
})
