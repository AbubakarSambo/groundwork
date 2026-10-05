import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * THE SCREEN A PERSON LANDS ON EVERY DAY. W-UX-2.
 *
 * Her words, on being shown the audit: "the ux is a shit show." This page was the clearest case,
 * and every fault on it was a DUPLICATE rather than a missing thing:
 *
 *  1. Every check-in's name appeared THREE times on one screen - the attention banner listed them,
 *     the card list listed them, and the rail listed them. Ten check-ins read as thirty things.
 *  2. Two of the three big numbers at the top read 0 on every account looked at.
 *  3. Two things called "Admin" sat six pixels apart meaning different things.
 *  4. Two full-width navy buttons were stacked on top of each other.
 *
 * Checked as source, following the convention of the other guards on this page's siblings: these
 * are wiring and wording, and every one of them shipped past a green suite.
 */
const CODE = readFileSync(join(__dirname, 'GroundsListPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

describe('one list, not three', () => {
  /* U.5: the banner went with the rebuild to the prototype's sections; the row's own "Needs you"
     says why each one is there, once. The rules below still hold and are checked on the new page. */
  it('nothing lists the check-ins a second time above the list', () => {
    expect(CODE).not.toMatch(/needsAttention/)
    expect(CODE.match(/<CheckInsTable /g)?.length).toBe(4)
  })

  it('but the signal itself is untouched, so nothing stops raising its hand', () => {
    const row = readFileSync(join(__dirname, 'how-a-row-reads.ts'), 'utf8')
    /* Live walk, 6 October: the legacy status now reads "Your" only to somebody in the check-in, so
       the two signals are separate lines; both still raise the row. */
    expect(row).toMatch(/g\.reportWaitingForMe\) needs = /)
    expect(row).toMatch(/g\.status === 'REPORT_READY'\) needs = /)
    expect(row).toMatch(/a\.kind === 'yours' \|\| a\.kind === 'overdue'/)
  })
})

describe('a count of nothing does not get a tile', () => {
  /*
   * REVERSED, ON PURPOSE, AND THIS IS THE REASON.
   *
   * The rule here used to keep "In progress" at zero, on the argument that zero in progress is
   * itself worth knowing. That held when the tile was the only thing on the screen saying so.
   *
   * It is not any more. On an admin's first screen the zero now sits above an empty state that says
   * "your first check-in is one tap away" in words, and a rollout panel saying which step they are
   * on - three things reporting the same emptiness, the largest of them a numeral. Reported as
   * "I need to get on the landing page and know what to do".
   *
   * The signal is not lost: it comes back the moment there is a number to show.
   */
  it('an empty section is not drawn, so no "0 open" ever shows', () => {
    /* U.5: the stat strip went; each section with its count is drawn only when it has rows. */
    expect(CODE).not.toMatch(/label: 'In progress'/)
    for (const pile of ['youRun', 'youreIn', 'others', 'finished']) expect(CODE).toContain(`{${pile}.length > 0 && (`)
  })
})

describe('two different things are not both called Admin', () => {
  it('this page no longer links to the back office at all', () => {
    /**
     * First pass renamed the link here to "Platform ops". Looking at the rendered page then showed
     * the real shape of it: Platform ops, Settings and Sign out were ALL duplicates of rail items an
     * inch to the left. Renaming a duplicate is not removing it, so the whole second nav strip went
     * and the rail item carries the name.
     */
    expect(CODE).not.toContain("navigate('/admin')")
    expect(CODE).not.toContain("navigate('/settings')")
    expect(CODE).not.toMatch(/>Sign out</)
  })

  it('and there is no "Admin" badge on the list at all: a badge of rank on every screen, removed 10 Sep 2026', () => {
    /** One occurrence: the role pill, which is not navigation. A second one is the bug. */
    expect(CODE).not.toMatch(/isAdmin \? 'Admin' : 'Team member'/)
  })
})

describe('one primary action per screen', () => {
  /* U.5: "Invite a team member" left this page; inviting is on People (U.4) and in the new
     organisation's checklist on Today. So the page has one full-size main button. */
  it('there is one full-size main button, and it is the one people came for', () => {
    expect(CODE.match(/>Start a check-in<\/Button>/g)).toHaveLength(1)
    const i = CODE.indexOf('>Start a check-in</Button>')
    const tag = CODE.slice(CODE.lastIndexOf('<Button', i), i)
    expect(tag).not.toMatch(/size=|kind="(secondary|quiet)"/)
    expect(CODE).not.toContain('Invite a team member')
  })
})
