import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * #20: the moment badge used to render the raw GroundMoment enum value
 * (e.g. "STARTING") unformatted, unlike the scenario label a few lines below
 * which goes through a label map. This locks that the moment badge also goes
 * through a label map with a sane fallback.
 */
const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'GroundAdminPage.tsx'),
  'utf8',
)

describe('#20 moment badge uses a human label', () => {
  it('defines a label for every GroundMoment enum value', () => {
    expect(src).toMatch(/MOMENT_LABELS/)
    for (const key of ['STARTING', 'RECOGNITION', 'RESOLUTION']) {
      expect(src).toMatch(new RegExp(`${key}:\\s*'[^']+'`))
    }
  })

  it('no longer shows a moment badge in the header at all: the scenario pill says what kind this is, and an enum is not a sentence (10 Sep 2026)', () => {
    expect(src).not.toMatch(/Opened for: \{/)
    expect(src).toMatch(/export const MOMENT_LABELS/)
  })
})
