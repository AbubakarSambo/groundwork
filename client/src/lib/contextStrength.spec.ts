import { describe, it, expect } from 'vitest'
import { whatThisGroundCanTellYou } from './contextStrength'

/**
 * THE CARD MUST NOT DISAGREE WITH ITSELF ABOUT THE GROUND IT IS DESCRIBING. W8-7.
 *
 * On a one-person ground it said "only one person is in this ground" and, four
 * lines later, "only the two of you are in it". Both lines came from the same
 * function, and the second was written for the two-person case and then reused
 * for anything under three.
 */

const base = {
  partyCount: 1,
  hasSuccessDefinition: false,
  conditionCount: 0,
  hasBaseline: false,
  perPersonObjectiveCount: 0,
  openDocumentCount: 0,
  peopleWorkTogether: true,
  plannedSessions: 1,
}

describe('how many people the card thinks are in the ground', () => {
  it('never says "the two of you" about a ground with one person in it', () => {
    const read = whatThisGroundCanTellYou({ ...base, partyCount: 1 })
    expect(read.cannot.join(' ')).not.toContain('two of you')
  })

  it('and still says it when there genuinely are two', () => {
    const read = whatThisGroundCanTellYou({ ...base, partyCount: 2 })
    expect(read.cannot.join(' ')).toContain('two of you')
  })

  it('at three the question becomes answerable and the line goes away', () => {
    const read = whatThisGroundCanTellYou({ ...base, partyCount: 3 })
    expect(read.cannot.join(' ')).not.toContain('two of you')
    expect(read.can.join(' ')).toContain('who is waiting on whom')
  })
})

describe('a ground always does something', () => {
  it('so the card is never a page of nothing but limits', () => {
    // The failure this guards is the one Hafsah met: one line of what it can do
    // against seven of what it cannot, which reads as the product apologising.
    const read = whatThisGroundCanTellYou({ ...base, partyCount: 2, hasSuccessDefinition: true })
    expect(read.can.length).toBeGreaterThan(0)
  })
})
