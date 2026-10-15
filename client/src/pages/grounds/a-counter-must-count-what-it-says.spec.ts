import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * "REPORTS READY 0" ABOVE A GROUND THAT SAYS "4 AGREED, 2 STILL OPEN".
 *
 * Found by signing in as the lead of a real org and reading her own grounds list. The tile was
 * labelled "Reports ready" and counted something else: reports waiting for THIS PERSON to open,
 * from which the initiator is deliberately exempt because they released it and can always read it.
 * Both halves were defensible alone. Together, on one screen, they told her nothing was ready while
 * the check-in beneath printed its report's own summary.
 *
 * It is the same defect as "0 of 3 checked in" over a finished report, which this product already
 * fixed once: a counter whose label promises one thing and whose value measures another. A leader
 * cannot act on a page that argues with itself.
 *
 * The second finding came out of fixing the first. `needsAttention` and the urgency sort both tested
 * `status === 'REPORT_READY'` - a status nothing has written since report release began
 * auto-activating to ACTIVE, as the schema's own comment records. So the banner could only fire on
 * an overdue check-in, and a released report nobody had read could not raise its hand at all.
 */
const SRC = readFileSync(join(__dirname, 'GroundsListPage.tsx'), 'utf8')
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/*
 * U.5: THE TILES WENT, AND THE RULE THEY WERE HELD TO STAYS. The list was rebuilt to the prototype's
 * sections ("You run 3 open", "You're in 2 open", "Finished"), so there is no "Waiting for you to
 * read" tile and no attention banner any more. What these checks protected still holds, and is now
 * checked where it lives: each count counts exactly the rows under it, a report nobody has read still
 * raises its hand and sorts to the top, the legacy REPORT_READY status still counts, and a session
 * past its date still surfaces. The rendered counts are checked in
 * the-check-ins-list-as-each-reader-reads-it.spec.tsx.
 */
const ROW = readFileSync(join(__dirname, 'how-a-row-reads.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('each count says what it counts', () => {
  it('is no longer labelled "Reports ready", nor anything else that counts one thing and says another', () => {
    expect(CODE).not.toMatch(/label: 'Reports ready'/)
  })

  it('"N open" counts exactly the rows in that section', () => {
    /*
     * UPDATED, GROUP 2 REBUILD: the page's own local `Section({ title, count })` is gone; each
     * heading is now the SHARED `Section` (components/gw/ui/Section.tsx), whose prop is `note`, and
     * the shared `CheckInsTable` takes its rows as children (`CheckInRow` elements), not a `rows`
     * array prop. The finding this test is named for - each section's count is the length of the
     * rows actually drawn under it, not a separate number that can drift from them - still holds,
     * checked the same way, against the new component names.
     */
    expect(CODE).toMatch(/<Section heading="You run" note=\{`\$\{youRun\.length\} open`\}>/)
    expect(CODE).toMatch(/note=\{`\$\{youreIn\.length\} open`\}/)
    expect(CODE).toMatch(/\$\{others\.length\} open/)
    expect(CODE).toMatch(/const open = rows\.filter\(r => !isFinished\(r\.g\)\)/)
  })
})

describe('a report nobody has read can raise its hand', () => {
  it('reads the live signal', () => {
    /* Live walk, 6 October: the legacy status now reads "Your" only to somebody in the check-in, so
       the two signals are separate lines; both still raise the row. */
    expect(ROW).toMatch(/if \(g\.reportWaitingForMe\) needs = \{ text: 'Your report is ready'/)
    expect(ROW).toMatch(/else if \(g\.status === 'REPORT_READY'\) needs = /)
  })

  it('and so does the ordering, so it sorts to the top', () => {
    const sort = CODE.slice(CODE.indexOf('function byWhatNeedsYou'))
    expect(sort.slice(0, 300)).toMatch(/tone === 'proven' \? 0/)
  })

  it('but the legacy status still counts, because old rows carry it', () => {
    expect(ROW).toMatch(/g\.status === 'REPORT_READY'/)
  })

  it('a session past its date still surfaces, and says how long ago it opened', () => {
    expect(ROW).toMatch(/a\.kind === 'yours' \|\| a\.kind === 'overdue'\) needs = \{ text: 'Your turn'/)
    expect(ROW).toMatch(/a\.kind === 'overdue'\) stands = `It opened \$\{a\.daysLate\} days ago`/)
  })
})

/* -------------------------------------------------------------------------- */

describe('the new organisation\'s checklist says what it counts', () => {
  /* U.3: "Setting up <organisation>" and its "1 of 4 needed, plus 1 optional" are replaced by the
     prototype's "Get <organisation> going" and "0 of 4 done", which counts every row it shows. The
     WhatsApp row is only shown, and only counted, while WhatsApp is switched on. */
  const SRC = readFileSync(join(__dirname, 'an-admin-lands-on-a-check-in-list.tsx'), 'utf8')

  it('counts exactly the rows it shows', () => {
    expect(SRC).toContain('{done} of {steps.length} done')
  })
})
