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
  it('only includes sections that have data, in G2’s own order', () => {
    // OKR_ALIGNMENT's "on" list (mapped ones only): Targets(objectives), Blockers(dependencies),
    // Patterns(patterns). "Optional": Starting agreement(startingState), Accounts side by
    // side(divergence), Change since last(quickRead).
    const out = orderedSwitchboardSections('OKR_ALIGNMENT', {
      objectives: true, dependencies: true, patterns: true,
      startingState: false, divergence: true, quickRead: true,
    }, true)
    expect(out).toEqual(['objectives', 'dependencies', 'patterns', 'divergence', 'quickRead'])
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
  it('lists the on/optional G2 sections with no served counterpart, for PIP', () => {
    const missing = switchboardSectionsNotServed('PIP')
    expect(missing).toContain('Person history')
    expect(missing).toContain('Blocker check')
    expect(missing).toContain('Questions for the lead')
    expect(missing).not.toContain('Starting agreement') // this one IS mapped (startingState)
  })
})
