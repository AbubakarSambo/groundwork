import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

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
     * "YOUR" (U.4 re-review, item 8): this is the reader's own count, staggered by when they
     * personally started, never the team's shared phase - see the comment above `opensLater` in
     * the component.
     */
    expect(page).toMatch(/<span>This is your session \{completedCheckIns\.length \+ 1\}\.<\/span>/)
  })
  it('and a session that opens later is dated, not numbered as current', () => {
    expect(page).toMatch(/opensLater \? \(\s*<span>Your next session opens on/)
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
  it('the report counts who is outstanding and names the session on the progress line', () => {
    const report = code('report/ReportPage.tsx')
    expect(report).not.toContain('The second is what makes it a comparison.')
    expect(report).toMatch(/outstandingParties/)
    expect(report).toContain('checked in for session {progress.sessionNumber}')
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
    expect(entry).toMatch(/from \$\{plannedFrom\.timelineDays\} days, \$\{plannedFrom\.cadence\.toLowerCase\(\)\}\. Click to change\./)
    expect(entry).not.toContain('does not\n                yet extract cadence')
  })
})
