import { describe, it, expect } from 'vitest'
import { CADENCES, TIMED_CADENCES, cadenceLabel, sessionsFor } from './cadence'
import { SCENARIOS } from '@/pages/grounds/CreateGroundPage'

/**
 * One vocabulary, one creation flow.
 *
 * Two screens could open a ground and they disagreed with each other. One called
 * a value "Fortnightly" and the other "Every 2 weeks"; one offered seventeen
 * situations and a timeframe but could not name a lead; the other could name a
 * lead but offered five situations and never asked how long the ground runs - so
 * a three month onboarding created there silently became a thirty day one, and
 * stopped asking people to check in two thirds of the way through.
 */

describe('cadence is named the same way everywhere', () => {
  it('has exactly one label per cadence', () => {
    const labels = CADENCES.map((c) => c.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('calls the fourteen-day cadence one thing, and that thing reads instantly', () => {
    /**
     * The rule this pins is unchanged: ONE label for the fourteen-day cadence,
     * not "Fortnightly" here and "Every 2 weeks" there.
     *
     * What changed is which one. "Fortnightly" is correct English and is not
     * read instantly by everyone, particularly across our markets and by
     * international readers. The bar is "reads instantly for everyone", not "is
     * correct English", so the label is now the one nobody has to pause on.
     */
    expect(cadenceLabel('FORTNIGHTLY')).toBe('Every 2 weeks')
  })

  it('excludes the lead-triggered cadence from the timed list, because it has no interval', () => {
    expect(TIMED_CADENCES.every((c) => c.days !== null)).toBe(true)
    expect(TIMED_CADENCES.map((c) => c.cadence)).not.toContain('SEQUENTIAL')
  })
})

describe('how many sessions a timeframe holds', () => {
  it('gives twelve weekly sessions over ninety days', () => {
    // The case that started this: a three month onboarding on a weekly rhythm.
    expect(sessionsFor(90, 'WEEKLY')).toBe(12)
  })

  it('gives six fortnightly sessions over ninety days', () => {
    expect(sessionsFor(90, 'FORTNIGHTLY')).toBe(6)
  })

  it('never says zero sessions, because a ground with no check-in reads as broken', () => {
    expect(sessionsFor(14, 'MONTHLY')).toBe(1)
  })

  it('returns null when the cadence is not time-based, rather than inventing a number', () => {
    expect(sessionsFor(90, 'SEQUENTIAL')).toBeNull()
  })
})

describe('the situations someone can pick from', () => {
  it('has a home for onboarding a group, which previously had none', () => {
    // It used to split across three cards - "New hire" (one person), "Cohort
    // check-in" (a recurring pulse) and "Performance improvement plan" (a far
    // more loaded thing to put four new starters on). Someone had to pick which
    // third of their situation to describe.
    const card = SCENARIOS.find((c) => c.cardKey === 'COHORT_ONBOARDING')
    expect(card).toBeTruthy()
    expect(card!.scenario).toBe('COHORT_CHECK')
    expect(`${card!.desc} ${(card!.examples ?? []).join(' ')}`.toLowerCase()).toMatch(/probation|onboarding/)
  })

  it('keeps the recurring cohort card distinct, so the two do not read as the same thing', () => {
    const recurring = SCENARIOS.find((c) => c.cardKey === 'COHORT_CHECK')!
    expect(recurring.desc).toMatch(/Onboarding a group/)
  })

  it('every card key is unique, so selection cannot be ambiguous', () => {
    const keys = SCENARIOS.map((c) => c.cardKey)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
