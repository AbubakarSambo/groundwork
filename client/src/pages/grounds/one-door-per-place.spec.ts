import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { groundTabs } from './ground-tabs'

/**
 * ONE ENTRANCE PER PART OF A CHECK-IN. W-UX-3.
 *
 * Her steer when this fix came up: "i am hoping we are not deleting the board but where it shows up
 * twice etc." That is exactly the distinction. The board was never duplicated - it is one page. What
 * was duplicated was the way IN: a "Team board →" pill in the header and a "Team board" tab in the
 * bar directly below it, on the same screen, going to the same URL.
 *
 * Two entrances to one room is worse than one, because a person who has been through one of them
 * cannot tell whether the other holds something they have not seen.
 *
 * So: ONE entrance. The board page, its content, and its route all stay.
 *
 * WHICH ENTRANCE CHANGED, AND THE INVARIANT DID NOT. It was the tab row; it is now a button at the
 * foot of Report. The tab row was wrong for a different reason than duplication: every other entry
 * in it changes what is below the row, and this one navigated away - so you left the check-in to look
 * at part of the check-in, and landed on a page carrying its own back-link because it did not know it
 * was a tab. The board is the shared picture you talk over once you have read the accounts, so it
 * opens from the report.
 *
 * The count is what this file protects, and it is still one.
 */
const ADMIN = readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const BOARD = readFileSync(join(__dirname, '../board/BoardPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
/* The report tab became a list of sessions, and the board is the first row of that list. Same
   entrance, one file over. */
const LIST = readFileSync(join(__dirname, '../../components/gw/TheReportIsAListOfSessions.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the board still exists and is still reachable', () => {
  /** Not in the tab row: every other tab stays on the page and this one never did. */
  it('is not a tab', () => {
    expect(groundTabs({ contextEnabled: true, canRunThisCheckIn: true, isAParty: true }).map(t => t.key)).not.toContain('board')
  })

  it('and the report is what opens it - the first row of the session list', () => {
    /* U.9: the board's row reads "The board", the prototype's words (sessions.txt). */
    expect(LIST).toContain('{EVERY_SESSION.board}')
    expect(ADMIN).toMatch(/onOpenBoard=\{\(\) => navigate\(`\/grounds\/\$\{ground\.id\}\/board`\)\}/)
  })

  /** Only where the server says there is one to open. */
  it('only when the server says there is a board', () => {
    expect(LIST).toContain('{boardRenders && (')
    expect(ADMIN).toMatch(/boardRenders=\{!!\(ground as any\)\.boardRenders\}/)
  })
})

describe('but only once', () => {
  /**
   * U.10 PICTURE-CHECK ROUND 6, ITEM I: A SECOND, DELIBERATE ENTRANCE - THE SHARED HEADER'S TAB.
   *
   * This test used to hold the count at 1: the Report tab's "The board" row was the only door,
   * because every OTHER entry in the old tab row changed what was below it while a "Team board"
   * pill navigated away, which read as one tab behaving unlike its neighbours.
   *
   * That is no longer true of the tab row itself. TheCheckInHeader (item I) puts a "Board" tab in
   * the SAME shared header every check-in page now uses - the prototype's own shape
   * (board-as-lead.jpg), where Board sits beside Check-in, Context, My work and People and setup,
   * all six tabs equally real links to a different page. The board's own header (built earlier in
   * this same round) already has this "Board" tab; this page matching it is the point of item I,
   * not a regression of the one-door rule. `groundTabs()` itself still does not carry a 'board' key
   * (see "is not a tab" above) - "Board" is added once, in the header's own tab list, the same way
   * on every check-in page - so there is still exactly one PLACE that decides the tab exists, even
   * though the header itself is now the second on-page way to reach it (tab row, and the Report
   * tab's own row) rather than the pill this test was written to keep out.
   */
  it('nothing OUTSIDE the tab row, the Report tab, the non-party Check-in message and the read-only redirect links to the board', () => {
    /**
     * The tripwire is now the COUNT OF a tab-row/header-unrelated forms - the pill this test was
     * written to keep out ("Team board →") - not the plain existence of the route string, which
     * now appears once in the header's own tab list, once in the Report tab's row, once (round 4,
     * item A step 3) in the Check-in tab's own message to a lead who is not a party - the one
     * reader for whom the Check-in tab would otherwise have nothing to offer, and for whom "go
     * read the board instead" is exactly the right door - and once more (Group 3's review,
     * contradiction 1) in the read-only admin's own `?tab=report` redirect: the note under this
     * reader's tabs tells them "You can read this check-in's board and reports", and the Board
     * page is the one of their three tabs that actually has the reports, so a link carrying
     * `?tab=report` now lands them there rather than on Context, where that sentence names
     * nothing on screen - and once more (screen fault 4, live walk 6 October 2026) in the anchor's
     * own auto-open guard: a lead on `HELP_TEAM_UNDERSTAND` has no ordinary first check-in of her
     * own to be walked into (the engine is separately asked, request 168, to stop creating one),
     * so landing on `?tab=chat` redirects her to the board instead of auto-opening a session that
     * should never have existed for her - and once more (B-019) in the Check-in tab's own message
     * to a PARTY whose check-in has already ended: "Bring this to your next check-in" is wrong once
     * there is no next one, and the board is where the full ending (who decided, when and why) is
     * read.
     */
    expect((ADMIN.match(/\/board`/g) ?? [])).toHaveLength(6)
    /* The prop, its type and its one use. What matters is that the component renders ONE button. */
    expect((LIST.match(/\{EVERY_SESSION\.board\}/g) ?? [])).toHaveLength(1)
    expect(ADMIN).not.toContain('Team board →')
  })
})

describe('and the way back leads to your own view of it', () => {
  it('the board returns you to the check-in, which routes by role', () => {
    /**
     * `/grounds/:id/p` is the party view specifically. Hard-coded here, a LEAD leaving the board
     * landed on the party view of their own check-in.
     */
    expect(BOARD).toContain('navigate(`/grounds/${id}`)')
    expect(BOARD).not.toContain('navigate(`/grounds/${id}/p`)')
  })
})
