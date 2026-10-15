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
 * check-in. The wording follows the server, which already says "the lead" when it refuses them,
 * rather than adding a fifth way to name the same person.
 *
 * MOVED FROM THE DEAD REPORT BODY (1 October 2026). `ReportBody` (`ReportPage.tsx`) is where "the
 * initiator" used to reach people, in two places: the toast after asking for somebody to be added,
 * and `personFor`, a fallback used when the report's stored `parties[].label` held the schema value
 * rather than a real one. Only the first has a live equivalent - `HiddenContributorRow`, on the
 * board, which replaced `ReportBody`'s add-or-request flow. `personFor` does not, and does not need
 * one: `a-label-is-not-a-person.spec.ts` already locks that no live surface reads `parties[].label`
 * at all, so there is nothing left for a fallback on that field to guard.
 */
const read = (p: string) => readFileSync(join(__dirname, p), 'utf8')
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

const BOARD = strip(read('board/BoardPage.tsx'))
/* U.4: roles are set, and said, on one person's page now, in the prototype's words (one-person.txt). */
const PEOPLE = strip(read('org/OnePersonPage.tsx'))

describe('a role should say what it does', () => {
  it('reads the real files, so an empty one cannot pass', () => {
    expect(BOARD.length).toBeGreaterThan(5000)
    expect(PEOPLE.length).toBeGreaterThan(3000)
  })

  it('the page where roles are set says what an admin can do', () => {
    expect(PEOPLE).toContain('Manages people and billing, and can read every check-in.')
  })

  it('and says what everybody else and a guest can do, so the role is resolvable', () => {
    expect(PEOPLE).toContain('Answers the check-ins they’re invited to.')
    expect(PEOPLE).toContain('Can start check-ins and run them. Takes part in others.')
    expect(PEOPLE).toContain('From another organisation. Sees only the check-ins they’re invited to.')
  })

  it('no role is offered as its own name alone', () => {
    expect(PEOPLE).not.toMatch(/<option value="ADMIN">Admin<\/option>/)
  })

  it('nobody is told a request went to "the initiator"', () => {
    expect(BOARD).not.toContain('Request sent to the initiator.')
    expect(BOARD).toContain('Request sent to the lead.')
  })
})
