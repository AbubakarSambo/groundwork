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

describe('the report tab shows the reports', () => {
  it('opens with the team board', () => {
    const board = TAB.indexOf('Open the team board')
    expect(board).toBeGreaterThan(-1)
    /* Before the report body, which is the whole of "first item on the page". */
    expect(board).toBeLessThan(TAB.indexOf('<ReportBody'))
  })

  it('renders the picture that is forming, not only the offer to release it', () => {
    const forming = TAB.indexOf('A picture is forming')
    expect(forming).toBeGreaterThan(-1)
    /* A ReportBody after the forming heading: the same body a released report uses, because it is
       the same row - the API writes it as soon as anybody finishes and marks it forming. */
    expect(TAB.indexOf('<ReportBody', forming)).toBeGreaterThan(forming)
  })

  it('lists every session of yours that has finished', () => {
    expect(TAB).toContain('Your sessions')
    expect(TAB).toMatch(/mySessions\.map/)
    /* And it opens the REPORT, not the conversation. Listing them was not enough: the link went
       to /checkin/:id, which is the transcript with a different, shorter summary under it, so the
       click read as "it sends me back to the chat and the report looks nothing like what I got at
       the end". See the-report-you-saw-is-the-one-that-opens.spec.ts. */
    expect(TAB).toMatch(/navigate\(`\/checkin\/\$\{ci\.id\}\/report`\)/)
  })

  it('and only yours, which is the wall rather than a simplification', () => {
    /* Another person's session is theirs until the shared report releases. The same rule the
       session grid keeps, and the reason this filters on userId at all. */
    expect(PAGE).toMatch(/p\.id === c\.participantId && p\.userId === user\?\.id/)
  })

  it('newest first, because the one you just finished is the one you are looking for', () => {
    expect(PAGE).toMatch(/\(b\.sessionNumber \?\? 0\) - \(a\.sessionNumber \?\? 0\)/)
  })
})
