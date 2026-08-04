import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * FORMING-REPORT SYMMETRY guard (client). The participant page used to show
 * a static "Report is being prepared... will be available once released"
 * message for ANY unreleased report, even once the backend started sending
 * forming content (report.forming) - the admin page already had a "View the
 * forming report" button gated on the same flag. Source-level: the
 * participant page must branch on report.forming and offer a way in.
 */
const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'GroundParticipantPage.tsx'),
  'utf8',
)

describe('GroundParticipantPage: offers a way into the forming report, not just "being prepared"', () => {
  it('branches on report.forming before the unreleased-report message', () => {
    expect(src).toMatch(/\(report as any\)\?\.forming \? 'A picture is forming'/)
  })

  it('gives the participant a navigable affordance into the forming report', () => {
    expect(src).toMatch(/View the forming picture/)
    expect(src).toMatch(/navigate\(`\/grounds\/\$\{id\}\/report`\)/)
  })
})
