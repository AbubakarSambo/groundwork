import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * "WHAT NOW?" USED TO GIVE YOU SOMETHING TO PRESS. NOW IT GIVES YOU NOTHING TO PRESS THAT ISN'T
 * REALLY THERE.
 *
 * This file used to pin a "What now?" section with two controls: "Start a new check-in" (a button
 * to `/grounds/new`, a brand-new, unrelated check-in) and a quiet "Copy the link" beneath it.
 *
 * RELEASE WALKTHROUGH A, FIX 4: "Start a new check-in" opened `/grounds/new` even for a
 * participant - most of whom have no way to start a check-in at all (`/start` refuses them) - and
 * neither of the prototype's own report screens (own-report.txt, one-session.txt,
 * B4-reports-and-sharing) offers any such button at the foot of a report. So the button, its
 * heading and the sentence built around it are gone; the one genuinely useful thing that block
 * held - a link to this report, for whoever already reads it - stays, quieter, with no heading
 * claiming it is this page's "now". This file is rewritten to pin THAT, not the removed button -
 * the old assertions pinned the very defect this fix removes.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CODE = readFileSync(path.join(__dirname, '..', 'report', 'SessionReportPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

describe('what now is not a button that does not work', () => {
  it('no longer offers "Start a new check-in"', () => {
    expect(CODE).not.toContain('Start a new check-in')
    expect(CODE).not.toContain("navigate('/grounds/new')")
  })

  it('no longer has a "What now?" heading built around that button', () => {
    expect(CODE).not.toContain('What now?')
  })

  it('still offers the link to this report, from the page that is the report', () => {
    expect(CODE).toContain('Copy the link')
    expect(CODE).toMatch(/\/checkin\/\$\{checkInId\}\/report/)
  })

  it('and still says what that link is not', () => {
    /* Owner-scoped. Offering "copy the link" beside a private report without saying so invites
       somebody to send it to a colleague who will be told the record does not exist. */
    /* "Entitled" was jargon (real-user walk, Kijani Foods, fault 6): plain words for the same
       fact, that opening the link is not what lets someone read this. */
    expect(CODE).toContain('opens only for people who may already read this')
  })

  /** A copy that silently fails is worse than no button: the person walks away with nothing. */
  it('says so if the copy fails', () => {
    /* Either shape of catch - the block form, or `.catch()` on the clipboard promise. What is
       being protected is that a failure is SAID, not which syntax says it. */
    /* Or the helper's boolean (fix plan C14): copy() resolves false where the API is absent, and the caller says so. */
    expect(CODE).toMatch(/(catch \{|\.catch\(|else toast\.error|await copy\()[\s\S]{0,160}toast\.error/)
  })

  /** The prose that told people to do what the removed buttons used to do stays gone. */
  it('no longer instructs where it can act', () => {
    expect(CODE).not.toContain('Use the report link or a shared doc')
    expect(CODE).not.toContain("title: 'Share the report'")
    expect(CODE).not.toMatch(/Nobody can do that part for\s+you/)
  })

  it('still draws nothing at the foot of a page that has refused the reader', () => {
    expect(CODE).toMatch(/\{!isLoading && !isError && \(\s*<div className="gw-print-none">/)
  })
})
