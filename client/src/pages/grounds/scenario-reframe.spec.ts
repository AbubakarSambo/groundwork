import { describe, it, expect } from 'vitest'
import { SCENARIOS } from './CreateGroundPage'
import { STATUS_DISPLAY } from '@/pages/enter/EntryChatPage'

/**
 * Scenario reframe tripwire: the reframe is DISPLAY ONLY.
 *
 * The AI (packs, classifier, report schema) must keep receiving the original
 * enum values. These tests pin the two places where a display rename could
 * silently leak into data:
 *   1. every picker card submits a real GroundScenario enum key, and
 *   2. the alignmentStatus ladder maps FROM the original schema values
 *      ('Unresolved'...'Aligned') - the display labels never replace them.
 * Plus the three label mismatches the reframe fixed stay fixed.
 */

// The canonical GroundScenario enum values (must match api/prisma/schema.prisma).
const ENUM_KEYS = [
  'ROLE_HANDOVER',
  'NEW_HIRE', 'NEW_COFOUNDER', 'NEW_ADVISOR', 'NEW_PROJECT', 'NEW_MANAGER',
  'CONTRACT_RENEWAL', 'RECOGNITION', 'DRIFT', 'CRISIS_ALIGNMENT', 'OKR_ALIGNMENT',
  'WORKPLAN_BUDGET', 'PULSE_CHECK', 'REALIGN_TEAM', 'PIP', 'BOARD_STRATEGY',
  'COHORT_CHECK', 'ACUTE_SHOCK',
  'CONTRACT_REVIEW', 'IMPLEMENTATION_TRACKING',
  /**
   * The scenario a described situation becomes when it matches no card. Its card is "Describe your
   * own situation", which previously carried REALIGN_TEAM here - so this guard passed while the
   * product silently created the wrong kind of ground.
   */
  'OPEN_READ',
  /**
   * One honest read from everyone, once. Added because a person wanting a single temperature read
   * had to open the recurring one and abandon it after a session - PULSE_CHECK's interview asks what
   * has changed since last time, so it cannot be that.
   */
  'SNAPSHOT',
]

describe('scenario reframe is display-only', () => {
  it('every card submits an untouched GroundScenario enum key', () => {
    for (const card of SCENARIOS) {
      expect(ENUM_KEYS, `card "${card.label}" submits a non-enum scenario`).toContain(card.scenario)
    }
  })

  it('card keys are unique even where two cards share a scenario', () => {
    const keys = SCENARIOS.map(c => c.cardKey)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('the three label mismatches stay fixed', () => {
    const byScenario = (s: string) => SCENARIOS.filter(c => c.scenario === s)
    /**
     * THESE TWO NO LONGER PIN A LITERAL, BECAUSE THE LITERALS THEY PINNED ARE GONE.
     *
     * This spec fixed a real mismatch in its day: DRIFT rendered as "New direction". It then froze
     * the replacement wording, which made it the thing standing in the way of the later decision
     * that all three surfaces name a situation once, from `scenario-catalog.ts`. It also pinned PIP
     * to "Performance improvement plan", so the rule that the word "performance" stays out of copy
     * the subject reads could not be applied here without a test going red.
     *
     * The label is now DERIVED from the catalog rather than written here, so the two cannot
     * disagree - see every-situation-is-offered.spec.ts, which asserts that derivation and the
     * absence of "performance". What survives here is what this spec was actually for: the old
     * wrong label must not come back.
     */
    expect(byScenario('DRIFT')[0].label).not.toBe('New direction')
    expect(byScenario('PIP')[0].label).not.toMatch(/performance/i)
    /**
     * REALIGN_TEAM NOW HAS EXACTLY ONE CARD, and that is the fix.
     *
     * It used to have two: its own honest label, plus "Describe your own situation" piggybacking on
     * it. That conflated the card somebody clicked with the scenario being created - so when the
     * free-text router failed, the check-in silently became a REALIGN_TEAM one, with that scenario's
     * board, questions and end states, while the screen said the person was getting "a general
     * ground". A cohort of managers who never work together would have been asked to get a team back
     * on the same page.
     *
     * Describe-your-own now carries OPEN_READ, which exists precisely for "the shape is not known".
     */
    // The COUNT is the fix, not the wording: exactly one card, and never the old "Other".
    // The wording now comes from the catalog ("People see it differently").
    const realign = byScenario('REALIGN_TEAM')
    expect(realign).toHaveLength(1)
    expect(realign.map(c => c.label)).not.toContain('Other')

    const describeOwn = SCENARIOS.filter(c => c.cardKey === 'DESCRIBE_OWN')
    expect(describeOwn).toHaveLength(1)
    expect(describeOwn[0].scenario).toBe('OPEN_READ')
  })

  it('every previously unsurfaced scenario is now a card, CRISIS_ALIGNMENT included', () => {
    /**
     * "CRISIS STAYS RETIRED" IS REVERSED, AND THIS RECORDS WHY, BECAUSE THE ORIGINAL GAVE NO REASON.
     *
     * Nothing in the engine treats it as retired. It has a prompt pack (CRISIS_PACK_COMBINED), a
     * board family, its own end states, its own invite copy, a 60-day default duration and a
     * willingness gate. It was also already reachable from outside: the routing map resolves
     * `?scenario=a+big+decision` from the marketing site. So the only thing "retired" achieved was
     * that a person already signed in could not choose a situation the product fully supports, and
     * a person following a link could.
     *
     * THE ONE REASON THAT WOULD HAVE JUSTIFIED IT, CHECKED AND FOUND NOT TO HOLD. CRISIS_ALIGNMENT
     * is one of three CONTRAINDICATED_SCENARIOS (grounds.service.ts) that are supposed to be
     * screened for active legal proceedings, fear of retaliation, and a decision already taken. If
     * the picker could not run that screen, adding the card would ship an unscreened conflict
     * ground. But no client surface anywhere collects `contraindicationAnswers` - grepping the whole
     * of client/src returns nothing - so the screen is skipped for DRIFT and RECOGNITION too, and
     * both of those have had cards all along. Keeping this one hidden protected nobody.
     *
     * That gap is real and is not fixed here: it is a missing screen on three scenarios, not a
     * missing card on one.
     */
    const scenarios = SCENARIOS.map(c => c.scenario)
    expect(scenarios).toContain('NEW_MANAGER')
    expect(scenarios).toContain('WORKPLAN_BUDGET')
    expect(scenarios).toContain('RECOGNITION')
    expect(scenarios).toContain('CRISIS_ALIGNMENT')
  })

  it('every scenario card carries recognizer sub-examples (describe-your-own may omit)', () => {
    for (const card of SCENARIOS) {
      if (card.cardKey === 'DESCRIBE_OWN') continue
      expect(card.examples, `card "${card.label}" has no examples`).toBeDefined()
      expect(card.examples!.length, `card "${card.label}" needs 2-3 examples`).toBeGreaterThanOrEqual(2)
    }
  })

  it('retired-CRISIS cases are absorbed as sub-examples under DRIFT and REALIGN_TEAM', () => {
    const drift = SCENARIOS.find(c => c.cardKey === 'DRIFT')!
    const realign = SCENARIOS.find(c => c.cardKey === 'REALIGN_TEAM')!
    expect(drift.examples!.join(' ')).toMatch(/blew up.*different story/i)
    expect(drift.examples!.join(' ')).toMatch(/cash is tight|runway/i)
    expect(realign.examples!.join(' ')).toMatch(/pulling two ways/i)
  })

  it('alignmentStatus display map keeps the ORIGINAL schema values as its keys', () => {
    // The report JSON's enum values are the keys; only what renders changes.
    expect(Object.keys(STATUS_DISPLAY).sort()).toEqual(
      ['Aligned', 'Clear', 'Emerging', 'Mixed', 'Unresolved'],
    )
    expect(STATUS_DISPLAY.Unresolved).toBe('Just started')
    expect(STATUS_DISPLAY.Aligned).toBe('Shared')
  })
})
