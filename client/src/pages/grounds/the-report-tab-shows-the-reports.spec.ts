import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THREE THINGS THE REPORT TAB DID NOT DO.
 *
 * "Open team board should be first item on reports page and we need to see each session's report
 * after. We are meant to see a forming report, so why make it disappear."
 *
 * THE BOARD sat under the report and above the closing controls, which is where a footnote goes and
 * it is the opposite of one: the board is the same picture for everyone, built from the accounts,
 * while the report on this tab is the lead's reading of them.
 *
 * THE FORMING PICTURE was announced and never shown. The branch said one was forming, said how many
 * people were still out, and offered to release it - without rendering a line of it. So a lead was
 * asked to decide whether to show the whole team something they had not been allowed to read.
 *
 * AND THEN THE TAB BECAME THE LIST. All three findings above were about a tab that carried a
 * report AND a list AND a board AND a release control: "the report page is annoying and carries
 * too much - it is just meant to show a list of sessions and then you click and get the report".
 * So the board is still first, the sessions are still all listed newest-first, and the forming
 * picture is still shown - on the session it belongs to, where it can say which session it is
 * forming FOR. Every session, not only yours, because a lead needs the row to know who it is
 * waiting on; the reports behind the rows are still walled.
 *
 * THE EARLIER SESSIONS had nowhere to be read from. A run is six or twelve sessions and each ends in
 * a private report; this tab showed the current round and nothing else. The reports were not deleted
 * - /checkin/:id renders one for any completed check-in of yours - but nothing listed them.
 */
const PAGE = readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8')

/** Just the report tab, so nothing elsewhere on this large page can satisfy these. */
const TAB = (() => {
  const start = PAGE.indexOf("{tab === 'report' && (")
  expect(start).toBeGreaterThan(-1)
  const end = PAGE.indexOf("{tab === 'checkins' && (", start)
  return PAGE.slice(start, end > start ? end : undefined)
})()

const LIST = readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'TheReportIsAListOfSessions.tsx'), 'utf8')
const SESSION_VIEW = readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'TheSessionsReport.tsx'), 'utf8')
/**
 * U.10: THE COUNTING MOVED, SO THIS DOES TOO.
 * `sessionRows` used to be computed inline in GroundAdminPage.tsx; it is now `buildSessionRows` in
 * lib/session-rows.ts, so the board's "Reports" table can use the exact same rows rather than a
 * second copy of the same counting. The newest-first sort this test protects moved with it.
 */
const SESSION_ROWS = readFileSync(join(__dirname, '..', '..', 'lib', 'session-rows.ts'), 'utf8')

describe('the report tab is a list of sessions', () => {
  it('opens with the team board', () => {
    /* U.9: the prototype's words, "The board" and "Everything so far" (sessions.txt). */
    const board = LIST.indexOf('{EVERY_SESSION.board}')
    expect(board).toBeGreaterThan(-1)
    /* Before the rows, which is the whole of "first item on the page". */
    expect(board).toBeLessThan(LIST.indexOf('Session {r.sessionNumber}'))
  })

  it('and carries nothing else - no report body, no picker, no resolution', () => {
    for (const gone of ['<ReportBody', 'A picture is forming', '<ResolutionPanel', '<HowThisHasMoved']) {
      expect(TAB).not.toContain(gone)
    }
  })

  it('lists the sessions, newest first, and each row opens that session', () => {
    expect(TAB).toContain('rows={sessionRows}')
    expect(LIST).toContain('Session {r.sessionNumber}')
    expect(LIST).toMatch(/navigate\(`\/checkin\/\$\{r\.myCheckInId\}\/report`\)/)
    expect(SESSION_ROWS).toMatch(/\(a, b\) => b - a/)
  })

  it('and every row says who it is counting, before you click', () => {
    /* U.9: "6 of 6 checked in", and who it waits for as a sentence ("Omar has not checked in yet."). */
    expect(LIST).toContain('checkedIn(r.answered, r.total)')
    expect(LIST).toContain('stillToCheckIn(r.waitingOn)')
  })

  it('the forming picture is still shown, on the session it is forming for', () => {
    /* U.9: the masthead says "Session 3. 2 of 4 people checked in." in place of "still forming · 2 of 4 answered". */
    expect(SESSION_VIEW).toContain('checked in.`')
    expect(SESSION_VIEW).toContain('Where things stand')
  })

  it('and your own report stays yours, which is the wall rather than a simplification', () => {
    /* A row is visible to a lead so they know who to chase. The REPORT behind it is owner-scoped
       on the server, and the row only carries a check-in id when the session is your own. */
    expect(PAGE).toMatch(/p\.userId === user\?\.id/)
    expect(LIST).toContain('myCheckInId')
  })
})
