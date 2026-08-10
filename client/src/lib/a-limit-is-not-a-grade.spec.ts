import { describe, it, expect } from 'vitest'
import { whatThisGroundCanTellYou, contextStrengthSentence } from './contextStrength'

/**
 * THE SAME RULE, GUARDED ON THIS SIDE TOO.
 *
 * contextStrength.ts is a deliberate copy of the API's
 * what-this-ground-can-tell-you.ts. The two build separately and a shared
 * workspace package for one pure function is a lot of machinery for nothing - but
 * a copy drifts unless something notices, so both sides carry the assertion that
 * matters, which is about the WORDING rather than the logic.
 *
 * The read is about the product's limits, never the person's competence. The
 * version that writes itself is a completeness score, and it is worse than
 * nothing: it makes somebody feel marked at the moment they are deciding whether
 * this product is on their side, and tells them nothing about what the effort
 * buys.
 */

const bare = {
  partyCount: 2,
  hasSuccessDefinition: false,
  conditionCount: 0,
  hasBaseline: false,
  perPersonObjectiveCount: 0,
  openDocumentCount: 0,
  peopleWorkTogether: true,
  plannedSessions: 12,
}

describe('the read shown on the context tab', () => {
  it('always says something it CAN do', () => {
    // A tab that opened with a list of failures would be telling somebody their
    // ground is worthless, which is untrue: two accounts of the same work is the
    // whole mechanism and needs nothing else configured.
    expect(whatThisGroundCanTellYou(bare).can.length).toBeGreaterThan(0)
  })

  it('names the missing thing and what it costs', () => {
    const cannot = whatThisGroundCanTellYou(bare).cannot.join(' ')
    expect(cannot).toMatch(/because none have been named/)
    expect(cannot).toMatch(/show movement, only position/)
  })

  it('uses no word that reads as a mark', () => {
    const text = [
      ...whatThisGroundCanTellYou(bare).can,
      ...whatThisGroundCanTellYou(bare).cannot,
    ].join(' ')
    for (const pattern of [/\bscore\b/i, /\bincomplete\b/i, /\b\d+%/, /you (have )?not/i, /required/i]) {
      expect(pattern.test(text)).toBe(false)
    }
  })

  it('talks about the report rather than the reader', () => {
    expect(contextStrengthSentence(whatThisGroundCanTellYou(bare))).toMatch(/^The report will be able to/)
  })
})
