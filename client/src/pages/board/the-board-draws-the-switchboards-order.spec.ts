import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { orderedSwitchboardSections } from './what-the-switchboard-allows'
import { SWITCHBOARD_MATRIX } from './the-switchboard-g2-table'

/**
 * U.10 RE-REVIEW ITEM 2: THE PAGE'S OWN ORDER, WIRED TO orderedSwitchboardSections().
 *
 * The 7 G2-mapped sections (objectives, startingState, divergence, whatTheRoomIsAbout, quickRead,
 * dependencies, patterns) are laid out as static JSX in BoardPage.tsx, in the fixed order G2's own
 * 30-section table gives them - which is the same order for every situation, because a situation's
 * row only ever narrows WHICH of the 7 it turns on (`shown.*` already gates that), never their
 * relative order. This reads BoardPage.tsx's own source, finds where each section's `shown.X`
 * block starts, and checks that document order against what orderedSwitchboardSections() computes
 * for several real situations - so if the two are ever edited out of step, this fails rather than
 * silently drawing the wrong order.
 */
const CODE = readFileSync(join(__dirname, 'BoardPage.tsx'), 'utf8')

const MARKERS: Record<string, RegExp> = {
  objectives: /\{shown\.objectives && b\.objectives && \(/,
  startingState: /\{shown\.startingState && b\.startingState && \(/,
  divergence: /\{shown\.divergence && b\.divergence && \(/,
  whatTheRoomIsAbout: /\{shown\.whatTheRoomIsAbout && \(/,
  quickRead: /\{shown\.quickRead && b\.quickRead && \(/,
  /* 23 November (journey 3): drawn only where its waits are not already under Blockers, so its condition goes on past this. */
  dependencies: /\{shown\.dependencies && b\.dependencies && /,
  patterns: /\{shown\.patterns && b\.patterns && \(/,
}

function documentOrderOf(sections: string[]): string[] {
  const positions = sections.map((s) => {
    const m = CODE.match(MARKERS[s])
    if (!m || m.index == null) throw new Error(`could not find ${s} in BoardPage.tsx`)
    return { s, at: m.index }
  })
  return positions.sort((a, b) => a.at - b.at).map((p) => p.s)
}

describe('the board draws the switchboard’s own order', () => {
  it('every one of the 7 mapped sections appears in BoardPage.tsx', () => {
    for (const s of Object.keys(MARKERS)) expect(CODE.match(MARKERS[s])).toBeTruthy()
  })

  it('the page’s own document order matches orderedSwitchboardSections(), for a situation with all 7', () => {
    // OKR_ALIGNMENT's row (Set goals and keep the team on track) turns on objectives, dependencies
    // and patterns, and makes startingState, divergence and quickRead optional - all 7 in one row.
    const computed = orderedSwitchboardSections('OKR_ALIGNMENT', {
      objectives: true, startingState: true, divergence: true, whatTheRoomIsAbout: false,
      quickRead: true, dependencies: true, patterns: true,
    }, true)
    expect(documentOrderOf(computed)).toEqual(computed)
  })

  it('matches for PIP too (Help someone get back on track), a different situation', () => {
    const computed = orderedSwitchboardSections('PIP', {
      objectives: true, startingState: true, divergence: true, whatTheRoomIsAbout: true,
      quickRead: true, dependencies: true, patterns: true,
    }, true)
    expect(documentOrderOf(computed)).toEqual(computed)
  })

  /*
   * BOARD REVIEW, SALES PIECE A, ITEM 1: PATTERNS NOW LEADS THE OTHER SIX, FOR EVERY SITUATION.
   *
   * This used to check that objectives always precedes patterns, because G2's own table lists
   * Targets long before Patterns. It no longer does: the other six of these seven sections (not
   * patterns) now draw inside "Everything else from this check-in", a fold near the foot of the
   * board, because no prototype screen shows them as their own heading - and CLAUDE.md protects
   * patterns (and coaching, right after it) from ever being folded away, so patterns alone stays in
   * the open, ahead of that fold. Updating this pinned expectation, not deleting it: the spot-check
   * still holds, just the other way round, for every situation that turns both on.
   */
  it('wherever objectives and patterns are both on, patterns now precedes objectives, for every situation', () => {
    for (const row of SWITCHBOARD_MATRIX) {
      const objOn = row.sectionsOn.includes('Targets') || row.optional.includes('Targets')
      const patOn = row.sectionsOn.includes('Patterns') || row.optional.includes('Patterns')
      if (objOn && patOn) {
        const order = orderedSwitchboardSections(row.scenario, {
          objectives: true, patterns: true, startingState: true, divergence: true,
          whatTheRoomIsAbout: true, quickRead: true, dependencies: true,
        }, true)
        expect(order.indexOf('patterns')).toBeLessThan(order.indexOf('objectives'))
      }
    }
  })
})
