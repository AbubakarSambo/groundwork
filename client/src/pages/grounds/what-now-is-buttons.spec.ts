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
/* Batch 2, group 5: the session report page is gone and a person's own report is drawn in My work, so the rule is read there. */
const CODE = readFileSync(path.join(__dirname, 'MyWorkPage.tsx'), 'utf8')
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

  it('and the report has an address of its own, in My work, that a link can open', () => {
    const TABS = readFileSync(path.join(__dirname, 'ground-tabs.ts'), 'utf8')
    expect(TABS).toContain('tab=mywork')
    expect(TABS).toContain('&report=')
  })

  /* "Copy the link to this report" and its line went with the report page (batch 2, group 5): the report's own address in My
     work is the link now, so there is no copy button and no failure for it to say. */
  /** The prose that told people to do what the removed buttons used to do stays gone. */
  it('no longer instructs where it can act', () => {
    expect(CODE).not.toContain('Use the report link or a shared doc')
    expect(CODE).not.toContain("title: 'Share the report'")
    expect(CODE).not.toMatch(/Nobody can do that part for\s+you/)
  })

})
