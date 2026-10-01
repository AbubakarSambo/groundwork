import { describe, it, expect } from 'vitest'
import { switchboardAllows, orderedSwitchboardSections, switchboardSectionsNotServed } from './what-the-switchboard-allows'

/**
 * U.10 RE-REVIEW ITEM A: "PICK A SITUATION AND ITS BOARD SHOWS WHAT'S ON, AND NOTHING THAT'S OFF."
 */
describe('switchboardAllows', () => {
  it('allows a section G2 turns on for this situation', () => {
    // OKR_ALIGNMENT ("Set goals and keep the team on track"): Targets is on, Blockers is on.
    expect(switchboardAllows('OKR_ALIGNMENT', 'objectives')).toBe(true)
    expect(switchboardAllows('OKR_ALIGNMENT', 'dependencies')).toBe(true)
  })

  it('allows a section G2 makes optional for this situation', () => {
    expect(switchboardAllows('OKR_ALIGNMENT', 'divergence')).toBe(true) // Accounts side by side, optional
  })

  it('never allows a section G2 does not name for this situation at all', () => {
    // OKR_ALIGNMENT's row does not name "Known and unknown" (whatTheRoomIsAbout) at all.
    expect(switchboardAllows('OKR_ALIGNMENT', 'whatTheRoomIsAbout')).toBe(false)
  })

  it('never allows a section G2 marks off on purpose', () => {
    // SNAPSHOT ("Take the pulse of the team"): Patterns is off on purpose (a one-time read has no
    // patterns to show), even though patterns are otherwise a real, servable section.
    expect(switchboardAllows('SNAPSHOT', 'patterns')).toBe(false)
  })

  it('never allows a section this situation does not name at all, on or optional', () => {
    // CONTRACT_REVIEW ("Check an agreement before signing") never names "Change since last"
    // (quickRead) as on or optional at all.
    expect(switchboardAllows('CONTRACT_REVIEW', 'quickRead')).toBe(false)
  })

  it('leaves a section G2 does not name at all (e.g. whoOwnsWhat, contribution) alone', () => {
    expect(switchboardAllows('OKR_ALIGNMENT', 'whoOwnsWhat')).toBe(true)
    expect(switchboardAllows('OKR_ALIGNMENT', 'contribution')).toBe(true)
  })

  it('allows everything when the scenario has no switchboard row at all', () => {
    expect(switchboardAllows('NOT_A_REAL_SCENARIO', 'objectives')).toBe(true)
    expect(switchboardAllows(null, 'objectives')).toBe(true)
  })
})

describe('orderedSwitchboardSections', () => {
  /*
   * U.10 RE-REVIEW ITEM 2: G2's TABLE POSITION, NOT "ON" SECTIONS BEFORE "OPTIONAL" ONES.
   *
   * OKR_ALIGNMENT turns Targets, Blockers and Patterns "on", and makes Starting agreement,
   * Accounts side by side and Change since last "optional" - but G2's own 30-row table interleaves
   * them: Targets(1), Starting agreement(5), Accounts side by side(6), Change since last(12),
   * Blockers(13), Patterns(15). The order is the table's position, whichever list a section is on.
   */
  it('only includes sections that have data, in G2’s own table order', () => {
    const out = orderedSwitchboardSections('OKR_ALIGNMENT', {
      objectives: true, dependencies: true, patterns: true,
      startingState: false, divergence: true, quickRead: true,
    }, true)
    expect(out).toEqual(['objectives', 'divergence', 'quickRead', 'dependencies', 'patterns'])
  })

  it('never includes patterns while patterns are off, even if G2 turns it on', () => {
    const out = orderedSwitchboardSections('OKR_ALIGNMENT', { objectives: true, patterns: true }, false)
    expect(out).not.toContain('patterns')
  })

  it('is empty for an unknown scenario', () => {
    expect(orderedSwitchboardSections('NOT_A_REAL_SCENARIO', { objectives: true }, true)).toEqual([])
  })
})

describe('switchboardSectionsNotServed', () => {
  /*
   * 1 OCTOBER, REQUEST 70: "Person history", "Blocker check", "Who waited on whom", "Contradictions",
   * "Busy or moving" and "Questions for the lead" now have a served field each (personHistory,
   * blockerCheck, whoWaitedOnWhom, contradictions, busyOrMoving, questionsForTheLead), so they moved
   * out of "not served" - this is an update to the test, not a loosening of it: it now checks the
   * sections the engine's own table still leaves unserved for PIP (Coaching, and the ones the record
   * genuinely does not hold, such as "Where the time went"), rather than ones request 70 answered.
   */
  it('lists the on/optional G2 sections with no served counterpart, for PIP', () => {
    const missing = switchboardSectionsNotServed('PIP')
    expect(missing).toContain('Coaching')
    expect(missing).toContain('Where the time went')
    expect(missing).not.toContain('Starting agreement') // this one IS mapped (startingState)
    expect(missing).not.toContain('Person history') // request 70: mapped to `personHistory`
    expect(missing).not.toContain('Blocker check') // request 70: mapped to `blockerCheck`
    expect(missing).not.toContain('Questions for the lead') // request 70: mapped to `questionsForTheLead`
  })
})
