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
/* The shared report a party reads moved into `SharedReportForAParty`, so the view that runs a
   check-in can show a lead the same thing. Both, joined, so these follow the content. */
const here = dirname(fileURLToPath(import.meta.url))
const src = [
  readFileSync(join(here, 'GroundParticipantPage.tsx'), 'utf8'),
  readFileSync(join(here, '../../components/gw/SharedReportForAParty.tsx'), 'utf8'),
].join('\n')

describe('GroundParticipantPage: offers a way into the forming report, not just "being prepared"', () => {
  it('branches on report.forming before the unreleased-report message', () => {
    expect(src).toMatch(/\(report as any\)\?\.forming \? 'A picture is forming'/)
  })

  it('gives the participant a real affordance into the forming report, not a dead link', () => {
    expect(src).toMatch(/\{\(report as any\)\?\.forming && \(/)
    /* `id!` was the page's own variable; inside the component it is the `groundId` prop. Same
       component, same props, one file along. Matched on the call rather than the spelling of what
       is passed to it. */
    expect(src).toMatch(/<ReportBody groundId=\{(?:id!|groundId)\} embedded\b/)
    expect(src).not.toMatch(/View the forming picture/)
    expect(src).not.toMatch(/navigate\(`\/grounds\/\$\{id\}\/report`\)/)
  })
})
