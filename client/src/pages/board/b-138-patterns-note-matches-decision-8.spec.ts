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

  it('the default note and the empty state both say "in a row or not"', () => {
    expect(SRC).toContain('Shown only after the same thing comes up in three check-ins, in a row or not. Each describes the work.')
    expect(SRC).toContain('Nothing to show here yet. A pattern appears only after the same thing comes up in three check-ins, in a row or not, and the person it is about always sees it first.')
  })

  it('the asset-loans cohort heading keeps its own note, also matching decision 8', () => {
    expect(SRC).toContain("'Shown only after the same thing comes up in three check-ins, in a row or not'")
  })
})
