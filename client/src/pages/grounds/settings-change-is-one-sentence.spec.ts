import { describe, it, expect } from 'vitest'
import { settingsChangeSentence, yourSessionsSentence } from './CheckInPeopleAndSetup'

/**
 * U.4 RE-REVIEW, ITEM 5: THE CHANGE LOG READS AS A SENTENCE.
 *
 * This used to read "How long this runs: 4 to 12 weeks. How often people check in: WEEKLY to
 * FORTNIGHTLY. Changed by the party on 30 Sept." - three pieces joined with colons, a raw setting
 * name (`WEEKLY`) nobody chose to show a reader, and "the party", which is work jargon. This proves
 * the replacement is one plain sentence, names the cadence in words, drops "party" for "the person
 * who runs it" or "an admin", and says "You" when the reader made the change themselves.
 */
describe('one settings change, as one sentence', () => {
  it('names how long it runs in weeks, not raw days, when the lead made it', () => {
    expect(settingsChangeSentence({
      changedAt: '2026-09-30T00:00:00.000Z', by: 'lead',
      weeks: { from: 4, to: 12 }, cadence: null,
    })).toBe('On 30 September, the person who runs it changed how long it runs from 4 weeks to 12 weeks.')
  })

  it('names the cadence in plain words, not the raw setting name, when an admin made it', () => {
    expect(settingsChangeSentence({
      changedAt: '2026-09-30T00:00:00.000Z', by: 'admin',
      weeks: null, cadence: { from: 'WEEKLY', to: 'FORTNIGHTLY' },
    })).toBe('On 30 September, an admin changed how often people check in from every week to every 2 weeks.')
  })

  it('says "You" when the reader made the change themselves', () => {
    expect(settingsChangeSentence({
      changedAt: '2026-09-30T00:00:00.000Z', by: 'you',
      weeks: { from: 4, to: 12 }, cadence: null,
    })).toBe('You changed how long it runs from 4 weeks to 12 weeks on 30 September.')
  })

  it('joins both changes into the one sentence, never two, and never a colon', () => {
    const sentence = settingsChangeSentence({
      changedAt: '2026-09-30T00:00:00.000Z', by: 'lead',
      weeks: { from: 4, to: 12 }, cadence: { from: 'WEEKLY', to: 'FORTNIGHTLY' },
    })
    expect(sentence).toBe('On 30 September, the person who runs it changed how long it runs from 4 weeks to 12 weeks and changed how often people check in from every week to every 2 weeks.')
    expect(sentence).not.toContain(':')
    expect(sentence).not.toContain('party')
  })

  it('says "not set" rather than nothing, when there was no earlier value', () => {
    expect(settingsChangeSentence({
      changedAt: '2026-09-30T00:00:00.000Z', by: 'lead',
      weeks: { from: null, to: 12 }, cadence: null,
    })).toBe('On 30 September, the person who runs it changed how long it runs from not set to 12 weeks.')
  })
})

/**
 * U.4 RE-REVIEW, ITEM 6: "YOUR SESSIONS" IS ONE SENTENCE, NOT A LABEL AND A NUMBER.
 *
 * Folded in from "You in this check-in", this used to read "1 of 12 done" beside its own "Your
 * sessions" label - a bare number, not a sentence.
 */
describe('"your sessions", as one sentence', () => {
  it('names both numbers in a sentence', () => {
    expect(yourSessionsSentence(1, 12)).toBe('1 of 12 sessions are done.')
  })

  it('reads correctly for exactly one planned session', () => {
    expect(yourSessionsSentence(1, 1)).toBe('1 of 1 session is done.')
  })

  it('still reads as a sentence when nothing planned is known', () => {
    expect(yourSessionsSentence(3, null)).toBe('3 sessions done so far.')
    expect(yourSessionsSentence(1, null)).toBe('1 session done so far.')
  })

  it('B-012: never says more are done than are planned', () => {
    expect(yourSessionsSentence(9, 6)).toBe('6 of 6 sessions are done.')
  })
})
