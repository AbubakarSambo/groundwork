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
    /*
     * THE WAY IN IS A DESTINATION NOW, NOT AN EMBED.
     *
     * It was `ReportBody` rendered underneath the message. That body has gone - it was a fourth
     * place to read the same findings - and removing it turned this message straight back into the
     * dead end this file exists to prevent, which is how the regression was caught.
     *
     * What matters is unchanged and is what is asserted: saying "a picture is forming" obliges the
     * screen to offer something to open. Both destinations hold forming content - the board
     * regenerates as people answer, and a session page shows that round's picture while it moves.
     * The board is gated on the scenario having one, so the second button is unconditional.
     */
    expect(src).toContain('See what has emerged so far')
    expect(src).toMatch(/onOpenBoard\(\)/)
    expect(src).toMatch(/onGoToMyRecord\(\)/)
    expect(src).not.toMatch(/View the forming picture/)
    expect(src).not.toMatch(/navigate\(`\/grounds\/\$\{id\}\/report`\)/)
  })
})
