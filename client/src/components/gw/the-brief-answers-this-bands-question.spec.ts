import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE BRIEF IS THE ANSWER TO THIS BAND'S OWN QUESTION, AND IT WAS NOT ON THE PAGE.
 *
 * Setup asks the lead "What is this about? What needs to be true at the end?" and stores the answer
 * on the ground. The Context band titled "What this check-in is for" rendered ONLY the structured
 * objectives, which are extracted later from the lead's own check-in - so a lead who had just
 * written a full brief opened the page and read "Nothing yet."
 *
 * Seen on a running ground whose brief was "Sam is joining to own the renewals for the twelve
 * accounts that went quiet last quarter..." with zero objectives: the band said nothing yet.
 *
 * WHAT MADE IT HARD TO SEE: the brief was not unused. It already counts towards
 * `hasSuccessDefinition` in the same component, so the page treated it as the statement of what
 * doing well means and simply never showed it.
 *
 * Comments stripped: this explanation quotes the strings it protects.
 */
const SRC = readFileSync(join(__dirname, 'ContextPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, '')

const BAND = (() => {
  const start = SRC.indexOf('What this check-in is for')
  const end = SRC.indexOf('SharedNote', start)
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return SRC.slice(start, end)
})()

describe('the brief answers this band own question', () => {
  it('found the band, so an empty slice cannot pass', () => {
    expect(BAND.length).toBeGreaterThan(400)
  })

  it('the brief is rendered, not only counted', () => {
    expect(BAND).toContain('{theBrief}')
  })

  it('a brief of nothing but whitespace is not a brief', () => {
    expect(SRC).toContain("const theBrief: string = ((ground as any).brief ?? '').trim()")
  })

  it('"Nothing yet" only shows when there is genuinely nothing', () => {
    const i = BAND.indexOf('Nothing yet.')
    expect(i).toBeGreaterThan(-1)
    /* Guarded by !theBrief - a brief alone is not nothing. */
    expect(BAND.slice(Math.max(0, i - 260), i)).toContain('!theBrief')
  })

  it('objectives still render alongside it - neither replaces the other', () => {
    expect(BAND).toContain('objectives.length > 0')
    /* One table since 22 September 2026: thirteen cards, each repeating "a number crosses a line",
       was the bulk she asked to be rid of. Since U.7 the table is its own file, TargetsBand.tsx, in
       the prototype's shape: the team's rows first, each named "The whole team", then each share. */
    expect(BAND).toContain('<TargetsBand')
    const TABLE = readFileSync(join(__dirname, 'TargetsBand.tsx'), 'utf8')
    expect(TABLE).toContain('const theTeams = targets.filter')
    expect(TABLE).toContain("'The whole team'")
  })

  it('the brief says whose words it is, rather than claiming both', () => {
    /* It read "from the lead's own check-in" unconditionally, which was untrue of a brief. Since U.7
       the targets are their own band, so the line is only about the brief, in the prototype's
       sentence: "Your words, from setup. Everyone reads this before they answer." */
    /* U.7 review: "Your words, from setup." only while the text everyone reads is her unchanged
       words, and then the truthful sentence about who reads it. The rendered lines, for each reader,
       are in the-context-page-as-each-reader-sees-it.spec.tsx. */
    expect(BAND).toContain('{whoseWords ? `${whoseWords} ` : \'\'}')
    expect(BAND).toContain('This is what everyone in this check-in reads before they answer.')
  })
})
