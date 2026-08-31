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
 *
 * The "way in" used to be a button that navigated to `/grounds/${id}/report`
 * - a route that just redirects back to the tab already on screen, so the
 * button was a dead end (see one-report-not-two.spec.ts). The fix embeds
 * `ReportBody` directly, the same way the lead's page already did for the
 * released state.
 */
const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'GroundParticipantPage.tsx'),
  'utf8',
)

describe('GroundParticipantPage: offers a way into the forming report, not just "being prepared"', () => {
  it('branches on report.forming before the unreleased-report message', () => {
    expect(src).toMatch(/\(report as any\)\?\.forming \? 'A picture is forming'/)
  })

  it('gives the participant a real affordance into the forming report, not a dead link', () => {
    expect(src).toMatch(/\{\(report as any\)\?\.forming && \(/)
    expect(src).toMatch(/<ReportBody groundId=\{id!\} embedded \/>/)
    expect(src).not.toMatch(/View the forming picture/)
    expect(src).not.toMatch(/navigate\(`\/grounds\/\$\{id\}\/report`\)/)
  })
})
