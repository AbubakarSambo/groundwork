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

const at = (label: string) => drawn.findIndex((l) => l === label)

describe('the order comes from one place', () => {
  it('draws what this sits under before the objective it qualifies', () => {
    expect(at('What this sits under')).toBeGreaterThan(-1)
    expect(at('What this sits under')).toBeLessThan(at('What everybody said good looks like'))
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
