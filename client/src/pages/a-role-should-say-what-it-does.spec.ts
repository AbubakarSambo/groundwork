import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * TWO WAYS A ROLE WAS SHOWN WITHOUT BEING EXPLAINED.
 *
 * "Admin" appeared as a badge beside people on the People page and on the check-in list, and
 * nothing anywhere in the product said what an admin could do. The dropdown that SETS the role had
 * the same gap in reverse: "Takes part", "Can open check-ins" and "Guest from another organisation"
 * all say what they do, and "Admin" was the role name on its own - the only option you had to
 * already know.
 *
 * The explanation is written from what the code enforces, not from the role names:
 * `who-may-open-a-check-in` decides who opens and who waits, and the rail's `adminOnly` items are
 * People, Connect and Billing.
 *
 * Separately, "the initiator" was still reaching people. It is the schema's word for whoever runs a
 * check-in, and it was rendered in two places: the toast after asking for somebody to be added, and
 * the fallback used when a party has no described role. The same word ALSO appears as a key the
 * model emits, which is matched and never shown - so this guards the two that are read, and leaves
 * the key alone.
 *
 * The wording follows the server, which already says "the lead"
 * when it refuses them, rather than adding a fifth way to name the same person.
 */
const read = (p: string) => readFileSync(join(__dirname, p), 'utf8')
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

const REPORT = strip(read('report/ReportPage.tsx'))
const PEOPLE = strip(read('org/OrgMembersPage.tsx'))

describe('a role should say what it does', () => {
  it('reads the real files, so an empty one cannot pass', () => {
    expect(REPORT.length).toBeGreaterThan(5000)
    expect(PEOPLE.length).toBeGreaterThan(3000)
  })

  it('the People page says what an admin can do, where roles are set', () => {
    expect(PEOPLE).toMatch(/Admins<\/strong>\s*\{?'?\s*manage people and billing|manage people and billing/)
  })

  it('and says what everybody else and a guest can do, so the pill is resolvable', () => {
    expect(PEOPLE).toContain('takes part in the')
    expect(PEOPLE).toContain('never open one here')
  })

  it('the role that sets it is no longer just its own name', () => {
    expect(PEOPLE).not.toMatch(/<option value="ADMIN">Admin<\/option>/)
    expect(PEOPLE).toMatch(/<option value="ADMIN">Admin - manages people and billing<\/option>/)
  })

  it('nobody is told a request went to "the initiator"', () => {
    expect(REPORT).not.toContain("Request sent to the initiator.")
    expect(REPORT).toContain("Request sent to the lead.")
  })

  it('and the rendered fallback is not the schema word either', () => {
    expect(REPORT).not.toMatch(/adminParty \? participantLabel\(adminParty\) : 'the initiator'/)
    expect(REPORT).toMatch(/adminParty \? participantLabel\(adminParty\) : 'the lead'/)
  })

  it('but the key the model emits is left alone, because it is matched and never shown', () => {
    /* Removing this would silently stop resolving labels into people. */
    expect(REPORT).toContain("if (l === 'the initiator') return adminHandle")
  })
})
