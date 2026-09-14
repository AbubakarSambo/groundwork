import { describe, it, expect } from 'vitest'
import { scenarioLabel, SCENARIO_FROM_LABEL, SCENARIO_KEYS, SCENARIO_LABELS } from './scenario-catalog'

describe('the situation catalog', () => {
  it('names every situation exactly once', () => {
    const names = SCENARIO_KEYS.map(k => SCENARIO_LABELS[k])
    expect(new Set(names).size, `two situations share a name: ${names.join(' | ')}`).toBe(names.length)
  })

  it('round-trips a label back to its own situation', () => {
    for (const k of SCENARIO_KEYS) {
      expect(SCENARIO_FROM_LABEL[SCENARIO_LABELS[k].toLowerCase()]).toBe(k)
    }
  })

  it('renders a scenario it has never heard of as words, not as a database value', () => {
    // The admin page interpolates this straight onto the lead's own dashboard.
    expect(scenarioLabel('SOME_NEW_THING')).toBe('Some New Thing')
    /* From the catalogue: what this asserts is that a known key resolves to its LABEL rather than
       to the enum value, not what that label happens to be. */
    expect(scenarioLabel('PIP')).toBe(SCENARIO_LABELS.PIP)
  })
})
