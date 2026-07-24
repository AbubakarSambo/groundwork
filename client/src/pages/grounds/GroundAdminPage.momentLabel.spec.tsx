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

  it('renders the moment badge through MOMENT_LABELS, not the raw enum', () => {
    expect(src).toMatch(/MOMENT_LABELS\[ground\.moment\]\s*\?\?\s*ground\.moment/)
  })
})
