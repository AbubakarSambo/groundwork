import { describe, it, expect } from 'vitest'
import { SITUATION_CARDS } from './EntryChatPage'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * Item 2: each situation card shows a recommended timeline so people see
 * what a check-in of that kind usually looks like before they commit - a
 * hint, not a commitment. Locks the exact confirmed values per card, and
 * that the freeform "describe it yourself" option gets no badge at all
 * (a canned duration would contradict "in your own words").
 */

const EXPECTED: Record<string, string> = {
  'A new hire starting': 'typically 90 days',
  'A new project starting': 'typically 90 days',
  'A new co-founder or partner': 'typically 90 days',
  'A new manager taking over': 'typically 90 days',
  'Setting shared goals': 'typically 90 days',
  'A big decision': 'typically one check-in',
  "Someone's work is off track": 'typically 90 days',
  'A project is off track': 'typically 90 days',
  'People see it differently': 'typically 60 days',
  // The nine added when /start was brought up to the same scenario set as
  // /grounds/new. Same rule: "typically", never a bare fixed duration, so the
  // badge reads as a recommendation rather than a commitment.
  'A new advisor or board member': 'typically 90 days',
  'Onboarding several people at once': 'typically 90 days',
  'A workplan and budget': 'typically 90 days',
  'Board or leadership strategy': 'typically two check-ins',
  'A regular read on live work': 'typically ongoing',
  'Several people in the same role': 'typically ongoing',
  'A raise, promotion, or recognition': 'typically one check-in',
  'A contract or renewal': 'typically two weeks',
  /**
   * WAS 'typically one check-in', WHICH THE CARD ITSELF HAD MADE UNTRUE.
   *
   * A shock is fourteen days at a daily cadence - the pack describes a first session that establishes
   * the picture and then a daily read against the recovery objective. The hint was written when the
   * scenario really was one session, and it survived the change that gave it thirteen more, so the
   * first thing a person read about it was the one thing about it that was no longer true.
   */
  'Something serious just happened': 'typically daily for two weeks',
  /**
   * THE ONE HINT WITHOUT "TYPICALLY", and that is the point of it.
   *
   * Every other hint hedges because the lead sets the timeframe and can change it. A one-off read
   * cannot become two: its cadence is ONE_TIME and no follow-up round is ever scheduled. "Typically
   * one check-in" would suggest it sometimes is not, which is the thing this card exists to be clear
   * about - it is the only situation in the product that does not run.
   */
  'A pulse check': 'one check-in, no follow-up',
  /* Short, and deliberately shorter than onboarding: a handover still running in three months is
     not a handover, it is the leaver still doing the job. */
  'A role changing hands': 'typically 30 days',
  /* It ends when the contract is signed, and 60 days is how long that takes when both sides mean
     to do it. A review still running at three months is two companies who have stopped. */
  'An agreement before it is signed': 'typically 60 days',
  /* A year, monthly, because the value of this one is entirely in the months where nothing
     happens. */
  'An agreement that is running': 'typically a year',
}

describe('situation card timeline hints', () => {
  it('every card carries its confirmed timelineHint', () => {
    for (const card of SITUATION_CARDS) {
      expect(card.timelineHint).toBe(EXPECTED[card.label])
    }
  })

  it('the freeform card gets no timeline hint (not part of SITUATION_CARDS, and the rendered dashed card carries no timelineHint text)', () => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'EntryChatPage.tsx'), 'utf8')
    const freeformBlock = src.slice(src.indexOf("My situation is different"), src.indexOf("My situation is different") + 400)
    expect(freeformBlock).not.toMatch(/timelineHint/)
  })

  it('renders the hint in the card, styled subordinate to the label/detail (not implying a fixed commitment)', () => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'EntryChatPage.tsx'), 'utf8')
    expect(src).toMatch(/card\.timelineHint/)
    // "typically" phrasing itself signals recommendation, not commitment -
    // guard that the badges array never states a bare fixed duration.
    /**
     * "typically" IS THE HEDGE, AND ONE CARD HAS NOTHING TO HEDGE.
     *
     * The rule is right: the lead sets the timeframe, so a bare duration on the card would read as a
     * commitment the product has not made. Every situation that RUNS must therefore hedge.
     *
     * The one-off read does not run. Its cadence is ONE_TIME and no follow-up round is ever
     * scheduled, so "typically one check-in" would suggest it is sometimes more - which is the exact
     * thing that card exists to be clear about, and how it got confused with the recurring read in
     * the first place. It is exempt by name rather than by loosening the pattern until it fits.
     */
    const NOTHING_TO_HEDGE = ['A pulse check']
    for (const [label, hint] of Object.entries(EXPECTED)) {
      if (NOTHING_TO_HEDGE.includes(label)) continue
      expect(hint).toMatch(/^typically /)
    }
  })
})
