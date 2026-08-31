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
  it('the attention banner states a count and does not list names again', () => {
    /**
     * The tripwire is the `.map` specifically. A count is welcome here - it is the one thing the
     * cards below cannot say. A second list of the same names is not.
     */
    expect(CODE).not.toMatch(/needsAttention\.map\(/)
    expect(CODE).toMatch(/check-ins? need(s)? you/)
  })

  it('but the signal itself is untouched, so nothing stops raising its hand', () => {
    /** The filter is the value. Removing the duplicate must not remove the reason it existed. */
    expect(CODE).toMatch(/reportWaitingForMe \|\| g\.status === 'REPORT_READY' \|\| \(g\.overdue \?\? 0\) > 0/)
    expect(CODE).toMatch(/needsAttention\.length/)
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
  it('the stat strip drops every empty number, the zero included', () => {
    expect(CODE).toMatch(/\.filter\(s => s\.val > 0\)/)
    expect(CODE).not.toMatch(/s\.label === 'In progress' \|\| s\.val > 0/)
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

  it('and "Admin" is left saying only what you are in this organisation', () => {
    /** One occurrence: the role pill, which is not navigation. A second one is the bug. */
    expect(CODE.match(/'Admin'/g) ?? []).toHaveLength(1)
  })
})

describe('one primary action per screen', () => {
  it('inviting a colleague is an outline button, not a second navy one', () => {
    const invite = CODE.slice(CODE.indexOf('Invite a team member') - 900, CODE.indexOf('Invite a team member'))
    expect(invite).toContain("background: 'none'")
    expect(invite).not.toContain("background: 'var(--gw-navy)', color: 'white'")
  })

  it('and the one action people actually came for is still the navy one', () => {
    /* Renamed from "What's going on?", which was the primary action in three places and said
       nothing about what pressing it does. The pin follows the button, not the old words. */
    expect(CODE).toMatch(/background: 'var\(--gw-navy\)', color: 'white'[\s\S]{0,400}Start a check-in/)
  })
})
