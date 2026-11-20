import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * B-138: "What keeps coming up"'s note read "Named after three check-ins in a row, never after
 * one." and the empty state read "A pattern appears only after three check-ins in a row" - both
 * the opposite of decision 8: "Patterns show only after three periods, whether or not they are in
 * a row." Reads the real source, as the other board wording specs in this folder do, since the
 * board needs a large mock set to render fully.
 */
const SRC = readFileSync(join(__dirname, 'BoardPage.tsx'), 'utf8')

describe('the patterns section tells decision 8\'s rule, not its opposite', () => {
  it('never shows the person three check-ins in a row are required', () => {
    expect(SRC).not.toContain("'Named after three check-ins in a row, never after one. Each describes the work.'")
    expect(SRC).not.toContain("'Patterns named after three check-ins in a row'")
    expect(SRC).not.toContain('A pattern appears only after three check-ins in a row,')
  })

  /* 15 November 2026 (boards made leaner): the note explaining when a pattern appears, and the empty-state sentence, were removed as explanation. The section is not drawn while there is no pattern, and nothing now states the rule at all, so nothing can state it wrongly. */
  it('draws no note about when a pattern appears, and no empty state', () => {
    expect(SRC).not.toContain('Shown only after the same thing comes up in three check-ins')
    expect(SRC).not.toContain('Nothing to show here yet. A pattern appears only after')
  })

  it('names the asset-loans cohort section by the plain heading, with no note of its own', () => {
    expect(SRC).not.toContain('One person, a place, or the model?')
  })
})
