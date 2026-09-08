import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { howFarThroughSetup } from './the-setup-steps-you-have-checked'

/**
 * NOTHING ON SETUP SAID WHETHER SOMEBODY HAD LOOKED AT IT.
 *
 * "We may want something to show if each setup step is complete, something to make a person review
 * each setup step and sign off, like a mark-done check sign. Something minor."
 *
 * Minor is the design. Setup is nine questions and most carry a default, so nothing is ever
 * "missing" the way a form field is missing - a default IS an answer. What was absent is the
 * person's own mark: which of these have I actually read.
 *
 * THE TICK IS INSIDE THE OPEN QUESTION, not on the closed row. A tick beside a heading somebody
 * has not read is a tick they can press without reading, which is the opposite of the point.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
const PAGE = strip(readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8'))

describe('signing off a setup question', () => {
  it('is reached by opening it', () => {
    /* Still gated on `open`: a tick beside a heading nobody has read is a tick pressed unread. */
    expect(PAGE).toContain('{open && onCheck && (')
    expect(PAGE).toContain('I have read this - sign it off')
  })

  /**
   * AND IT IS THE LAST THING IN THE QUESTION, NOT THE FIRST.
   *
   * "the setup check but that says i have checked this is hidden and not very visible." It sat
   * directly under the fold's header, ABOVE the content - passed on the way in, before there was
   * anything to sign off, and reading as a caption on the heading. It is below the answer now, on
   * its own bar, which is where somebody arrives having read it.
   */
  it('and sits after the content rather than above it', () => {
    const content = PAGE.indexOf("{open && <div style={{ padding: '2px 14px 14px'")
    const signOff = PAGE.indexOf('{open && onCheck && (')
    expect(content).toBeGreaterThan(-1)
    expect(signOff).toBeGreaterThan(content)
  })

  it('replaces the number rather than sitting beside it', () => {
    /* A row carrying a number AND a tick is two marks for one thing, and the numbers are the
       order the questions were asked in. */
    expect(PAGE).toMatch(/\{checked \? '\\u2713' : n\}/)
  })

  it('can be taken back', () => {
    expect(PAGE).toContain('forgetYouCheckedIt(id!, n)')
    expect(PAGE).toContain('rememberYouCheckedIt(id!, n)')
  })

  it('and the tally sits where its total is actually known', () => {
    /* `setupBand()` increments as each fold renders, so the total does not exist until they have.
       Above the folds it would read zero of zero on the first paint. */
    const tally = PAGE.indexOf('howFarThroughSetup(setupChecked, setupBands)')
    const lastFold = PAGE.lastIndexOf('foldProps(setupBand())')
    expect(tally).toBeGreaterThan(lastFold)
  })
})

describe('what the tally says', () => {
  it('reads none as a state rather than a failure', () => {
    expect(howFarThroughSetup([], 9)).toBe('You have not signed off any of the 9 setup questions yet.')
  })

  it('counts, and says when they are through', () => {
    expect(howFarThroughSetup([1, 2, 3], 9)).toBe('3 of 9 setup questions signed off.')
    expect(howFarThroughSetup([1, 2], 2)).toBe('You have looked at all 2 setup questions.')
  })

  it('and says nothing at all when there are no questions to count', () => {
    expect(howFarThroughSetup([], 0)).toBe('')
  })
})

/**
 * AND A TICK BELONGS TO A PERSON, NOT TO A BROWSER.
 *
 * It was `localStorage` keyed on the check-in, so the marks belonged to whichever browser made
 * them - a second admin opened Setup and found questions already signed off by whoever last used
 * that machine, under a row reading "You have signed this off". Keying it by person fixed who owned
 * them and left the other half: it survived a reload and not a change of laptop, while the row
 * asserts that somebody reviewed something on a date.
 *
 * It is a table now, one row per person per question, and this module is the calls. What is pinned
 * here is that nothing reaches for a browser store any more - that is the regression that would put
 * the same claim back on top of the same sand.
 */
describe('a sign-off is kept as a record, not in the browser', () => {
  const MODULE = readFileSync(join(__dirname, 'the-setup-steps-you-have-checked.ts'), 'utf8')

  it('goes to the server', () => {
    expect(MODULE).toMatch(/apiClient\.get<\{ steps: number\[\] \}>\(`\/grounds\/\$\{groundId\}\/setup-sign-offs`\)/)
    expect(MODULE).toMatch(/apiClient\.post<\{ steps: number\[\] \}>\(`\/grounds\/\$\{groundId\}\/setup-sign-offs\/\$\{step\}`/)
    expect(MODULE).toMatch(/apiClient\.delete<\{ steps: number\[\] \}>\(`\/grounds\/\$\{groundId\}\/setup-sign-offs\/\$\{step\}`\)/)
  })

  it('and nothing here touches a browser store any more', () => {
    /* Comments stripped first: this module's own note explains where the marks USED to live, and a
       guard that a comment can satisfy is not a guard - it would fail on its own history. */
    expect(strip(MODULE)).not.toMatch(/localStorage|sessionStorage/)
  })

  it('and the page reads it as a query rather than as start-up state', () => {
    expect(PAGE).toMatch(/queryKey: \['setup-sign-offs', id\]/)
    expect(PAGE).toMatch(/queryFn: \(\) => stepsYouHaveChecked\(id!\)/)
  })
})
