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
 *
 * THE PANEL MOVED TO THE BOARD, and the gate had to move with it. The check-in's report tab is a
 * list of sessions now and the board is the screen that carries the whole run, so the end of the
 * run belongs there - but moving the panel without its condition put four buttons including "Stop
 * the project" on the board of a check-in that started yesterday, which is this defect again. The
 * board gates on its own spine: the run is at or past its last session, or somebody has already
 * picked an end state.
 */

const SRC = readFileSync(join(__dirname, '../board/BoardPage.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/** The overview tab's resolution panel, with the condition in front of it. */
const BLOCK = (() => {
  const at = SRC.indexOf('<ResolutionPanel')
  if (at === -1) throw new Error('ResolutionPanel is no longer rendered anywhere.')
  return SRC.slice(Math.max(0, at - 1400), at + 200)
})()

const PANEL = readFileSync(join(__dirname, '../../components/gw/ResolutionPanel.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the resolution panel', () => {
  it('is gated, not unconditional', () => {
    // THE FIX. Without a condition it renders on day one of every ground.
    expect(BLOCK).toMatch(/nearTheEnd=\{nearTheEnd\}/)
    expect(PANEL).toMatch(/nearTheEnd === false/)
  })

  it('appears when the check-in is at or near its last session', () => {
    expect(BLOCK).toMatch(/done >= planned - 1/)
  })

  it('and counts the PLANNED sessions, not the ones that happen to have rows', () => {
    /*
     * Driven on a check-in at session 1 of 6 and the exit appeared. `phaseSpine.sessions` lists
     * only the session numbers check-in rows exist for - two, at that point - so the arithmetic
     * read 1 >= 1 and called it the end of the run. The run's length is the check-in's timeline
     * and cadence, which is what its own header counts.
     */
    expect(BLOCK).toContain('plannedSessionsFor(')
    expect(BLOCK).not.toMatch(/const total = sessions\.length/)
  })

  it('and stays visible once a check-in is already mid-decision', () => {
    // Somebody who has started resolving must not lose the panel because the
    // arithmetic says it is early. Losing it would strand a half-finished
    // decision with no way back to it.
    /* This half moved INTO the panel: the caller supplies the arithmetic and only the panel knows
       whether anybody has picked, so it is the one that can answer this. */
    expect(PANEL).toMatch(/if \(nearTheEnd === false && !decisionUnderWay\) return null/)
    expect(PANEL).toMatch(/confirmations \?\? \[\]\)\.some\(\(c\) => c\.confirmed\)/)
  })

  it('counts sessions everybody has finished, not the furthest ahead', () => {
    // `sessionsDone` is the minimum across participants. Using the highest would
    // offer the exit while somebody is still four rounds behind - the same
    // optimism that once closed a check-in over a missing account.
    /* Was asserted on the inline `Math.min(...perParticipantDone)`. That rule moved into
       `whichSessionIsThisCheckInOn` so the roster and the counter could stop disagreeing, and a
       spec pinned to where it used to live said nothing about whether it still held. Run it. */
    expect(whichSessionIsThisCheckInOn([[1, 2, 3, 4], [1]])).toBe(2)
    expect(whichSessionIsThisCheckInOn([[1, 2], [1, 2]])).toBe(3)
    /* The board's own read: a spine session is 'done' only when every check-in for it completed,
       which IS the min-across-people rule. What must never be used here is `currentSession`, the
       highest session NUMBER any row carries - rows for the next session exist the moment one
       person finishes, so it runs ahead of the run and would offer the exit early. */
    expect(BLOCK).toMatch(/x\.state === 'done'/)
    expect(BLOCK).not.toMatch(/currentSession/)
  })
})
