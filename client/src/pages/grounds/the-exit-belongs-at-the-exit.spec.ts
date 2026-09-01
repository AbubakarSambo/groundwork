import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { whichSessionIsThisCheckInOn } from '@/lib/which-session-are-we-on'

/**
 * HOW A GROUND ENDS IS NOT THE FIRST THING YOU SEE ABOUT IT.
 *
 * `ResolutionPanel` was the first card on the check-in's Overview tab, unconditionally,
 * from the moment a check-in existed. On a brand new ground it read:
 *
 *   "Each person picks the outcome they think the record supports. The check-in closes
 *    only when everyone picks the same one, and nobody closes it alone."
 *
 * above four buttons including "Stop the project", at Session 2 of 6, with one
 * participant, reporting "0 of 1 person has answered".
 *
 * Two faults in one card. The first thing somebody saw about their new ground was how
 * to end it, and the copy described a group agreement in a check-in with a group of one.
 *
 * The product's own help modal prescribes the opposite thing at the start - "Set a
 * resolution state before the check-in starts... agreeing on the end state before you
 * start changes the quality of every session" - but that is a different panel (W8-59).
 * This one is the exit, and the exit belongs at the exit.
 *
 * Asserted against source because the condition is the whole fix, and a render test
 * would need a full ground payload to say something a one-line condition already says.
 */

const SRC = readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/** The overview tab's resolution panel, with the condition in front of it. */
const BLOCK = (() => {
  const at = SRC.indexOf('<ResolutionPanel')
  if (at === -1) throw new Error('ResolutionPanel is no longer rendered on the check-in page.')
  return SRC.slice(Math.max(0, at - 700), at + 120)
})()

describe('the resolution panel', () => {
  it('is gated, not unconditional', () => {
    // THE FIX. Without a condition it renders on day one of every ground.
    expect(BLOCK).toMatch(/\{\(.*&&\s*\(\s*$|\{\(.*\) && \(/m)
    expect(BLOCK).toMatch(/allSessionsDone/)
  })

  it('appears when the check-in is at or near its last planned session', () => {
    expect(BLOCK).toMatch(/plannedSessions/)
    expect(BLOCK).toMatch(/sessionsDone\s*>=\s*plannedSessions\s*-\s*1/)
  })

  it('and stays visible once a check-in is already mid-decision', () => {
    // Somebody who has started resolving must not lose the panel because the
    // arithmetic says it is early. Losing it would strand a half-finished
    // decision with no way back to it.
    expect(BLOCK).toMatch(/ground\.resolutionState/)
  })

  it('counts the session everyone has finished, not the furthest ahead', () => {
    // `sessionsDone` is the minimum across participants. Using the highest would
    // offer the exit while somebody is still four rounds behind - the same
    // optimism that once closed a check-in over a missing account.
    /* Was asserted on the inline `Math.min(...perParticipantDone)`. That rule moved into
       `whichSessionIsThisCheckInOn` so the roster and the counter could stop disagreeing, and a
       spec pinned to where it used to live said nothing about whether it still held. Run it. */
    expect(whichSessionIsThisCheckInOn([[1, 2, 3, 4], [1]])).toBe(2)
    expect(whichSessionIsThisCheckInOn([[1, 2], [1, 2]])).toBe(3)
    expect(SRC).toMatch(/whichSessionIsThisCheckInOn\(/)
  })
})
