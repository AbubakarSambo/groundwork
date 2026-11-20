import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE REPORT TAB SAID "NO REPORT YET" AND "NOTHING TO REPORT ON YET" OVER A REPORT.
 *
 * Read off a live forming report - shared picture, central question, honest close, all rendered:
 *
 *   No report yet
 *   The report has not named an area the accounts agree or differ on.
 *   A picture is forming ... you can release what there is now
 *   SALES TEAM, FIRST QUARTER
 *   Nothing to report on yet.
 *
 * Both denials are gated on the ALIGNMENT read, which stays empty until the report names an area
 * the accounts agree or differ on - and a one-sided report cannot name one, because agreement is
 * two-sided. So both branches fire on exactly the report they are most wrong about, and this is
 * the third time round on this page: two earlier passes made the empty states agree with each
 * other, and neither noticed that the gate itself was the wrong question.
 *
 * A report exists or it does not, and `report` is what says so.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
const ADMIN = strip(readFileSync(join(__dirname, '..', 'grounds', 'GroundAdminPage.tsx'), 'utf8'))
/**
 * THE SHARED PAGES PEOPLE OPEN. This read `ReportPage.tsx` - the body with no importers - for the
 * two assertions below. The first `it` had already moved to the live files; these follow it.
 */
const SHARED: Record<string, string> = {
  'the session report': strip(readFileSync(join(__dirname, '../../components/gw/TheSessionsReport.tsx'), 'utf8')),
  "a party's report": strip(readFileSync(join(__dirname, '../../components/gw/SharedReportForAParty.tsx'), 'utf8')),
  'the board': strip(readFileSync(join(__dirname, '../board/BoardPage.tsx'), 'utf8')),
}

describe('a report that exists', () => {
  it('is never announced as absent', () => {
    /*
     * The heading that did it is gone with the report body it sat above - the tab is a list of
     * sessions, and a row cannot deny a report because it says how many answered and whether it is
     * final. What is left to protect is that no denial came back with the rewrite.
     */
    /* The 11px status on a check-in row in the LIST is a different thing and correct: that row is
       about a check-in, and some check-ins genuinely have no report. What must not exist is a
       heading over a report saying the report is not there. */
    expect(ADMIN).not.toMatch(/fontSize: 16[^\n]*No report yet/)
    const LIST = strip(readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'TheReportIsAListOfSessions.tsx'), 'utf8'))
    expect(LIST).not.toContain('No report yet')
    /* The one empty state it does have is about sessions, not about the report. */
    expect(LIST).toContain('No check-in has finished yet')
  })

  it('and is never described as having nothing in it', () => {
    for (const [name, src] of Object.entries(SHARED)) {
      expect(src, `${name} says a report has nothing in it`).not.toContain('Nothing to report on yet')
    }
  })

  /*
   * THE THIRD ASSERTION, RETIRED RATHER THAN TRANSLATED, with where it went.
   *
   * "While a one-sided report still says what it cannot do" read a sentence in the dead body about
   * one person having checked in so far. The live version of that promise is asserted in
   * `a-shared-report-needs-two-people-and-the-page-says-so`, on three surfaces rather than one: the
   * party page, the lead page, and the list row - and against the same rule the server releases by.
   * Checking it here as well is how two copies drift apart.
   */
})
