import { describe, it, expect } from 'vitest'
import { SCENARIO_LABELS } from '@/lib/scenario-catalog'
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
  [SCENARIO_LABELS.NEW_HIRE]: 'typically 90 days',
  [SCENARIO_LABELS.NEW_PROJECT]: 'typically 90 days',
  [SCENARIO_LABELS.NEW_COFOUNDER]: 'typically 90 days',
  [SCENARIO_LABELS.NEW_MANAGER]: 'typically 90 days',
  [SCENARIO_LABELS.OKR_ALIGNMENT]: 'typically 90 days',
  [SCENARIO_LABELS.CRISIS_ALIGNMENT]: 'typically one check-in',
  [SCENARIO_LABELS.PIP]: 'typically 90 days',
  [SCENARIO_LABELS.DRIFT]: 'typically 90 days',
  [SCENARIO_LABELS.REALIGN_TEAM]: 'typically 60 days',
  // The nine added when /start was brought up to the same scenario set as
  // /grounds/new. Same rule: "typically", never a bare fixed duration, so the
  // badge reads as a recommendation rather than a commitment.
  [SCENARIO_LABELS.NEW_ADVISOR]: 'typically 90 days',
  'Onboarding several people at once': 'typically 90 days',
  [SCENARIO_LABELS.WORKPLAN_BUDGET]: 'typically 90 days',
  [SCENARIO_LABELS.BOARD_STRATEGY]: 'typically two check-ins',
  [SCENARIO_LABELS.PULSE_CHECK]: 'typically ongoing',
  [SCENARIO_LABELS.COHORT_CHECK]: 'typically ongoing',
  [SCENARIO_LABELS.RECOGNITION]: 'typically one check-in',
  [SCENARIO_LABELS.CONTRACT_RENEWAL]: 'typically two weeks',
  /**
   * WAS 'typically one check-in', WHICH THE CARD ITSELF HAD MADE UNTRUE.
   *
   * A shock is fourteen days at a daily cadence - the pack describes a first session that establishes
   * the picture and then a daily read against the recovery objective. The hint was written when the
   * scenario really was one session, and it survived the change that gave it thirteen more, so the
   * first thing a person read about it was the one thing about it that was no longer true.
   */
  [SCENARIO_LABELS.ACUTE_SHOCK]: 'typically daily for two weeks',
  /**
   * THE ONE HINT WITHOUT "TYPICALLY", and that is the point of it.
   *
   * Every other hint hedges because the lead sets the timeframe and can change it. A one-off read
   * cannot become two: its cadence is ONE_TIME and no follow-up round is ever scheduled. "Typically
   * one check-in" would suggest it sometimes is not, which is the thing this card exists to be clear
   * about - it is the only situation in the product that does not run.
   */
  [SCENARIO_LABELS.SNAPSHOT]: 'one check-in, no follow-up',
  /* Short, and deliberately shorter than onboarding: a handover still running in three months is
     not a handover, it is the leaver still doing the job. */
  [SCENARIO_LABELS.ROLE_HANDOVER]: 'typically 30 days',
  /* It ends when the contract is signed, and 60 days is how long that takes when both sides mean
     to do it. A review still running at three months is two companies who have stopped. */
  [SCENARIO_LABELS.CONTRACT_REVIEW]: 'typically 60 days',
  /* A year, monthly, because the value of this one is entirely in the months where nothing
     happens. */
  [SCENARIO_LABELS.IMPLEMENTATION_TRACKING]: 'typically a year',
  /* The same quarter as the card beside it: a cascade is read across the same period, and giving
     the two goal cards different lengths would be a distinction with nothing behind it. */
  'Connect Goals Across the Team': 'typically 90 days',
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

  it('renders the run length hedged, not as a fixed commitment', () => {
    /*
     * IT USED TO READ THE ENTRY CHAT'S OWN CARD, and that card is gone: both pickers share one
     * component now, because the two drew the same twenty-two situations as two different objects
     * and it was reported twice. The hint the entry card carried - "typically 90 days" - is the
     * shared card's "Usually runs for", taken from the catalogue rather than a hand-kept string, so
     * a situation's length is stated in one place and cannot disagree with itself.
     *
     * The rule it protected is unchanged and now applies at both doors: the lead sets the timeframe,
     * so a bare duration on a card would read as a commitment the product has not made.
     */
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'components', 'gw', 'SituationCard.tsx'), 'utf8')
    expect(src).toContain('Usually runs for')
    expect(src).not.toMatch(/<dt>Runs for<\/dt>/)
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
    /* The one-off. Its hint states a fact rather than hedging a length, because it has none. */
    const NOTHING_TO_HEDGE = [SCENARIO_LABELS.SNAPSHOT]
    for (const [label, hint] of Object.entries(EXPECTED)) {
      if (NOTHING_TO_HEDGE.includes(label)) continue
      expect(hint).toMatch(/^typically /)
    }
  })
})
