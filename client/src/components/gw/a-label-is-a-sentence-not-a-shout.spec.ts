import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * U.9 REVIEW FIX 12, AND ITS RE-REVIEW: A LABEL IS A SHORT SENTENCE, NEVER A SHOUTED, NUMBERED
 * CAPTION, AND NOTHING IS JOINED WITH "·" OR " - " WHERE A FULL SENTENCE BELONGS.
 *
 * The first review found this card's own block labels and citations rendered as "01 THIS IS THE
 * TOP OF IT" and a person's own name under a quote as "RUKIA OTIENO (YOU)" - CSS `textTransform:
 * 'uppercase'` on top of a leading `padStart(2, '0')` number, on wording that was already a plain
 * sentence underneath. The re-review found the same pattern (and two more: a "·" or " - " joining
 * two facts instead of one sentence, and a two-tier "LABEL" then a lower-case "note" line under
 * it) across every surface a person's own report and the team's report are built from. This spec
 * scans every one of those surfaces, so the pattern cannot come back in one file while being fixed
 * in another.
 *
 * WHAT THIS DOES NOT ASSERT, AND WHY. A blanket scan for "·" or " - " across the whole codebase
 * would fire on things nobody can fix here - CSS strings, non-visible internal labels passed
 * between components, code comments. This scans only the files this round's fixes touched, after
 * stripping comments, and only literal string/template pieces - the same discipline
 * `the-order-comes-from-one-place.spec.ts` and `nothing-pushes-the-page-sideways.spec.ts` already
 * use for this kind of source check.
 */
const FILES = [
  'TheSessionsReport.tsx',
  'TheCheckInYouJustFinished.tsx',
  'TheReportYouSawAtTheEnd.tsx',
  'the-shape-every-close-is-drawn-in.tsx',
  'WhatWasTakenFromWhatYouSaid.tsx',
  'TheFiveThingsThatMakeItCheckable.tsx',
  'HowSpecificThisSessionWas.tsx',
  'WhatToProbeThemOn.tsx',
  'SharedReportForAParty.tsx',
  'the-shared-picture-a-party-reads.tsx',
  'HowThisHasMoved.tsx',
]

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const read = (name: string) => strip(readFileSync(join(__dirname, name), 'utf8'))

/** Every plain string/template-literal piece in the file - where a "·" or " - " inside one would
    actually reach a reader, rather than sitting in a style object key or a prop name. */
function literalPieces(src: string): string[] {
  return [...src.matchAll(/['"`]([^'"`\n]*)['"`]/g)].map((m) => m[1])
}

describe('a label on these surfaces is a sentence, not a shout', () => {
  it('never sets a label or a citation in all caps', () => {
    for (const file of FILES) {
      expect(read(file), file).not.toMatch(/textTransform:\s*['"]uppercase['"]/)
    }
  })

  it('never numbers a block for the reader ("01 What this sits under")', () => {
    for (const file of FILES) {
      expect(read(file), file).not.toMatch(/padStart\(2, ['"]0['"]\)/)
    }
  })

  it('never joins two facts with "·"', () => {
    for (const file of FILES) {
      const offenders = literalPieces(read(file)).filter((s) => s.includes('·'))
      expect(offenders, file).toEqual([])
    }
  })

  it('never joins two sentences with " - "', () => {
    /*
     * ONE KNOWN EXCEPTION, NAMED RATHER THAN SILENTLY ALLOWED. `TheReportYouSawAtTheEnd.tsx`
     * passes `${p.name} - ${p.context}` to `renderAdd`, a slot the caller (EntryChatPage.tsx, a
     * different module, B1/B2, not U.9) fills in and ultimately renders with its own dash join.
     * Fixing the join fully means touching that caller, which is out of this round's scope; it is
     * excluded here by name rather than let it pass by accident.
     */
    const KNOWN_EXCEPTIONS = ['`${p.name} - ${p.context}`']
    for (const file of FILES) {
      const offenders = literalPieces(read(file))
        .filter((s) => / - /.test(s))
        .map((s) => '`' + s + '`')
        .filter((s) => !KNOWN_EXCEPTIONS.includes(s))
      expect(offenders, file).toEqual([])
    }
  })
})
