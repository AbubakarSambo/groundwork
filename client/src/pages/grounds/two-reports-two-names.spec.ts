import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * "REPORT SENT TO EVERYONE" ABOVE "REPORT REVEAL STATUS - WAITING".
 *
 * Reproduced on a real released report: the header strip said the report had gone to everybody,
 * and five hundred pixels below, a panel said nobody had revealed theirs. Both true. On one screen
 * they read as the product contradicting itself.
 *
 * They are different reports. The header tracks the SHARED report, released to the organisation.
 * The panel tracks each person's OWN private report, which they reveal to each other separately.
 *
 * The product already separates those words everywhere else - "Your private report" against
 * "Shared report" - and this one panel said neither. Same defect and same fix as "0 of 2 checked
 * in" over a roster showing two people checked in, and as the tile counting nine above ten cards:
 * say which thing you mean.
 *
 * WHERE THE TWO NAMES LIVE NOW. The reveal panel went with the report tab's body. The same two
 * things still exist and still need distinguishing, one file apart: the check-in header speaks for
 * the SHARED report, and the per-session report's own rows speak for each person's private one -
 * "not answered yet" against "answered". Neither of them says a bare "report".
 */
const CODE = readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

describe('two reports do not share one name', () => {
  it('reads the real file, so an empty one cannot pass', () => {
    expect(CODE.length).toBeGreaterThan(5000)
  })

  it('the answered state says which report it is about', () => {
    const VIEW = readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'TheSessionsReport.tsx'), 'utf8')
    /* This distinguished somebody who had answered from somebody who had also pressed the reveal.
       The reveal is gone, so there is one state left and it is whether they answered. */
    /* U.9: the same single state, as a sentence ("Omar has not checked in yet."). */
    /* Changed 24 November (page audit, row 6): only who has not checked in is named. */
    expect(VIEW).toContain('not checked in yet.')
    expect(VIEW).toContain('const missing = counting.filter((c) => !c.answered)')
    expect(VIEW).not.toContain('shown theirs')
    /* The wording that named neither. */
    expect(CODE).not.toMatch(/Report reveal status \{/)
    expect(CODE).not.toMatch(/allActivated/)
  })

  /* Changed in batch 2, group 5 (Hafsah, item 42): the Check-in tab's status line, which said "report sent to everyone", went
     with the page in between. Whether the shared report is out is said once, on the board's Reports rows. */
  it('and the check-in page no longer says a report state of its own', () => {
    expect(CODE).not.toMatch(/'report sent to everyone'/)
  })

  it('the two no longer use one word for two things', () => {
    /* If a future edit renames either to a bare "report", they collide again. The header's word is
       "sent to everyone", which can only mean the shared one; the per-person state is "shown
       theirs", which can only mean their own. */
    const VIEW = readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'TheSessionsReport.tsx'), 'utf8')
    expect(VIEW).not.toMatch(/report (reveal|status)/i)
  })
})
