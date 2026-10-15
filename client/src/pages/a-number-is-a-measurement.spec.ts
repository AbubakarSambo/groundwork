import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { sessionAndWhoCheckedIn } from '@/components/gw/TheSessionsReport'

/**
 * A NUMBER IS A MEASUREMENT. Five screens printed a number the code itself knew was a guess: a
 * hardcoded 6 under the comment naming the hardcoded 6 as the bug; "session N" from a counter the
 * same file's exit gate refuses to use; "Total sessions" over ground-creation reasons; "the second
 * is what makes it a comparison" on a four-person check-in; and a "Specificity" meter that counted
 * turns. The rule: when the denominator is unknown, print the numerator alone; when the label and
 * the count disagree, change the label; never invent a measurement.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const code = (rel: string) => readFileSync(path.join(__dirname, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('no total means no total', () => {
  const page = code('grounds/GroundParticipantPage.tsx')
  it('the participant page no longer guesses six, and prints the session alone when the total is unknown', () => {
    expect(page).not.toMatch(/\?\? 6\b/)
    expect(page).toMatch(/const totalSessions: number \| null =/)
    /*
     * Full sentence, no dot (U.8 review): "This is your session {n}.", not "· Session {n}".
     * "YOUR" (U.4 re-review, item 8): this is the reader's own position, staggered by when they
     * personally started, never the team's shared phase - see the comment above `opensLater` in
     * the component.
     *
     * FAULT 3b (ESTHER, LIVE RE-WALK): `completedCheckIns.length + 1` PINNED THE VERY BUG IT
     * SHOULD HAVE CAUGHT. It counts completed ROWS, and a self-corrected session leaves two rows
     * for the one session actually finished - inflating this past the real session she was on, and
     * disagreeing with the header's own count of the same check-in. `mySessionNumber` (computed
     * with the shared `whichSessionAreWeOn` rule, immune to a duplicate row) replaces it.
     */
    expect(page).toMatch(/<span>This is your session \{mySessionNumber\}\.<\/span>/)
  })
  it('and a session that opens later is dated, not numbered as current', () => {
    /*
     * GROUP 3'S REVIEW, CONTRADICTION 5: this header's own date is now skipped on the Check-in
     * tab, where BetweenCheckIns already says the same date more fully (with the weekday and the
     * time) - see the-next-session-date-is-not-said-twice.spec.tsx. The date is still what this
     * branch of the header says everywhere else; only the extra `tab !== 'checkin' &&` guard is
     * new.
     */
    expect(page).toMatch(/opensLater \? \(\s*tab !== 'checkin' && <span>Your next session opens on/)
  })
  it('the resolution gate stays closed on an unknown total', () => {
    expect(code('../components/gw/MyRecord.tsx')).toMatch(/totalSessions != null && completedCount >= totalSessions - 1/)
    expect(code('../components/gw/MyParticipation.tsx')).not.toMatch(/\{completedCount\} of \{totalSessions\}/)
  })
})

describe('the label says what is counted', () => {
  it('the board counts sessions everybody finished, never the running session number', () => {
    const board = code('board/BoardPage.tsx')
    expect(board).not.toMatch(/session \{b\.phaseSpine\.currentSession\}/)
    expect(board).toMatch(/filter\(\(x\) => x\.state === 'done'\)\.length/)
  })
  it('the dashboard sums ground-creation reasons and says check-ins', () => {
    const dash = code('admin/AdminDashboardPage.tsx')
    expect(dash).not.toContain('Total sessions')
    expect(dash).toContain('Check-ins created')
  })
  it('the report counts who has checked in and names the session, never a fabricated total', () => {
    /*
     * MOVED FROM THE DEAD REPORT BODY (1 October 2026). `ReportBody`'s "Picture forming - X of Y
     * checked in for session N" lived in `ReportPage.tsx`, not mounted by any route since the
     * Report tab became a list of sessions. `TheSessionsReport.tsx`'s `sessionAndWhoCheckedIn` is
     * the live equivalent - same rule, a real count rather than an invented one, named against the
     * session it is for.
     */
    expect(sessionAndWhoCheckedIn(3, 12, 2, 4)).toBe('Session 3 of 12. 2 of 4 people checked in.')
    /* No planned total is said as "Session N." alone, never a fabricated "of M". */
    expect(sessionAndWhoCheckedIn(3, null, 2, 4)).toBe('Session 3. 2 of 4 people checked in.')
  })
  it('the entry report labels the turn count as depth, with no bar and no grade word', () => {
    const entry = code('enter/EntryChatPage.tsx')
    expect(entry).not.toContain('Specificity: {label}')
    expect(entry).not.toMatch(/\[1,2,3,4,5\]\.map\(n =>/)
    expect(entry).not.toContain('How concrete and specific your answers were')
    /* "Depth: {turns} ..." became a full sentence in the U.8 review (no label, no dot-joined
       clause): "You gave {turns} answer(s)." with "More answers make the report stronger."
       appended below four. Still labels the turn count as depth of participation, not specificity. */
    expect(entry).toContain('You gave ${turns} ${turns === 1 ? \'answer\' : \'answers\'}.')
    /* The label opens on what pressing does since 0c8a95a68 ("Change how many check-ins. ... planned from N days, weekly."), so it no
       longer ends on "Click to change."; it still says the count comes from the days and the rhythm. */
    expect(entry).toMatch(/Change how many check-ins\. .*planned from \$\{plannedFrom\.timelineDays\} days, \$\{plannedFrom\.cadence\.toLowerCase\(\)\}\./)
    expect(entry).not.toContain('does not\n                yet extract cadence')
  })
})
