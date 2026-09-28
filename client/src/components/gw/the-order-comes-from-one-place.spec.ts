import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * THE ORDER OF A REPORT IS NOT WHATEVER THE JSX HAPPENS TO BE.
 *
 * Eight surfaces each held their own order in their own file, which is why the objective appears
 * third on one page and not at all on another. `the-four-reports.ts` on the server declares it
 * once, with the three rules that make it an argument rather than a preference. This checks the
 * page against that declaration, so the two cannot drift without something failing.
 *
 * Comments are stripped first: a rule quoted in a comment must never be what satisfies an
 * assertion about the code.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const REPORT = strip(readFileSync(join(__dirname, 'TheSessionsReport.tsx'), 'utf8'))

/**
 * The labels this page draws, in the order it draws them.
 *
 * Matched anywhere inside the opening tag rather than immediately after `<Row`: the blocks carry a
 * number and a note now, and an extraction that depends on attribute ORDER silently finds nothing
 * the first time somebody adds one. Which is what happened.
 */
const drawn = [...REPORT.matchAll(/<Row\b[^>]*?label=(?:"([^"]+)"|\{[^}]*?'([^']+)'[^}]*?\})/g)]
  .map((m) => m[1] ?? m[2])

/*
 * U.9 RE-REVIEW, ITEM A: LABELS NOW SAY MORE THAN ONE WORD OF CONTENT IN ONE SENTENCE.
 * "What this sits under" and "What everybody said good looks like" used to be a short name with a
 * separate lower-case note under it ("what the objective serves", "the objective, and each
 * person's own version of it"); the note is folded into the same sentence as the label now, so the
 * label text itself is longer. This still checks the label a reader sees BEGINS with the same
 * words, which is what "comes before" means here - the block itself has not moved.
 */
const at = (label: string) => drawn.findIndex((l) => l.startsWith(label))
/**
 * U.9 THIRD REVIEW, ITEM 3: THE CASCADE BLOCK'S LABEL NO LONGER STARTS WITH "WHAT THIS SITS
 * UNDER" AT ALL. "This is the top of it; nothing sits above it" and "What this sits under, and
 * what the objective serves" both talked about "it" without ever saying what "it" was - said
 * plainly now, as "This is part of a bigger goal." or "Nobody has said what bigger goal this is
 * part of.", depending on whether one is set. The two labels no longer share a prefix, so this
 * looks for either one, whichever the fixture's data produced.
 */
const atEither = (labels: string[]) => drawn.findIndex((l) => labels.some((label) => l.startsWith(label)))
const CASCADE_LABELS = ['This is part of a bigger goal.', 'Nobody has said what bigger goal this is part of.']

describe('the order comes from one place', () => {
  it('draws what this sits under before the objective it qualifies', () => {
    expect(atEither(CASCADE_LABELS)).toBeGreaterThan(-1)
    expect(atEither(CASCADE_LABELS)).toBeLessThan(at('What everybody said good looks like'))
  })

  it('draws the objective before anything measured against it', () => {
    expect(at('What everybody said good looks like')).toBeLessThan(at('Where things stand'))
  })

  it('draws the sharp part before the prose', () => {
    /* the-sharp-part-first settled this for the other body. Same rule, stated where it applies. */
    expect(at('Where things stand')).toBeLessThan(at('The picture from everybody'))
  })

  it('draws the conversation before the method, and the method last', () => {
    expect(at('The conversation worth having now')).toBeLessThan(at('What this is built from'))
    expect(at('What this is built from')).toBe(drawn.length - 1)
  })

  it('draws no run block on the report for one session', () => {
    /* A pattern says "seen across four sessions" and what-moved is a distance between two points.
       Both are claims about a run, on the page about one of them. They are on the board. */
    expect(REPORT).not.toContain('What keeps showing up')
    expect(REPORT).not.toContain('What moved')
    expect(REPORT).not.toContain('d.patterns')
  })

  it('and refuses the run sections by name rather than by silence', () => {
    /* Silence means the next change to the section list quietly puts them back. */
    expect(REPORT).toContain('NOT_ON_A_SESSION')
    expect(REPORT).toContain('What changed since last session')
  })
})
