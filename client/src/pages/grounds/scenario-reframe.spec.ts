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
  'NEW_HIRE', 'NEW_COFOUNDER', 'NEW_ADVISOR', 'NEW_PROJECT', 'NEW_MANAGER',
  'CONTRACT_RENEWAL', 'RECOGNITION', 'DRIFT', 'CRISIS_ALIGNMENT', 'OKR_ALIGNMENT',
  'WORKPLAN_BUDGET', 'PULSE_CHECK', 'REALIGN_TEAM', 'PIP', 'BOARD_STRATEGY',
  'COHORT_CHECK', 'ACUTE_SHOCK',
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
    expect(byScenario('DRIFT')[0].label).not.toBe('New direction')
    expect(byScenario('DRIFT')[0].label).toBe("Something's off track")
    expect(byScenario('PIP')[0].label).toBe('Performance improvement plan')
    // REALIGN_TEAM has TWO cards: the honest realignment label plus the
    // separate describe-your-own path. Neither is the old "Other" catch-all.
    const realign = byScenario('REALIGN_TEAM')
    expect(realign.map(c => c.label).sort()).toEqual(
      ['Describe your own situation', 'Get a team back on the same page'],
    )
    expect(realign.map(c => c.label)).not.toContain('Other')
  })

  it('the previously unsurfaced scenarios are now cards; CRISIS stays retired', () => {
    const scenarios = SCENARIOS.map(c => c.scenario)
    expect(scenarios).toContain('NEW_MANAGER')
    expect(scenarios).toContain('WORKPLAN_BUDGET')
    expect(scenarios).toContain('RECOGNITION')
    expect(scenarios).not.toContain('CRISIS_ALIGNMENT')
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
