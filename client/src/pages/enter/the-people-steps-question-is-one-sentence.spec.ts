import { describe, it, expect } from 'vitest'
import { ANCHOR_PEOPLE_STEP_RULES } from './TheSetup'

/**
 * THE PEOPLE STEP ASKS ITS QUESTION IN ONE FULL SENTENCE (Hafsah, 15 October 2026).
 *
 * The note a lead can write beside each person was labelled "What do they do / why are they part of this?", two pieces
 * joined by a slash. Hafsah approved "What do they do, and why are they part of this?", which is what the engine serves
 * (entry/the-anchor-people-step.ts). The screen's fallback, drawn when nothing was served, says the same words.
 */
describe('the people step\'s question beside each person', () => {
  it('is the sentence Hafsah approved, the same as the engine serves, with no slash', () => {
    expect(ANCHOR_PEOPLE_STEP_RULES.contextLabel).toBe('What do they do, and why are they part of this?')
    expect(ANCHOR_PEOPLE_STEP_RULES.contextLabel).not.toContain('/')
  })
})
