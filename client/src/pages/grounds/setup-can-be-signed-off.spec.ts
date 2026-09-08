import { describe, it, expect, beforeEach, vi } from 'vitest'
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
    expect(PAGE).toContain('forgetYouCheckedIt(id!, user?.id, n)')
    expect(PAGE).toContain('rememberYouCheckedIt(id!, user?.id, n)')
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
 * The store was keyed on the check-in alone, so the ticks belonged to whichever browser made them -
 * while the row they draw reads "You have signed this off", a claim about a person made from a
 * store that had no idea which person. Walked as a second admin of an organisation: her Setup tab
 * opened with two questions already signed off, because somebody else had signed them off in that
 * browser. Any shared machine, or any second account on one, inherited the first person's review of
 * a check-in they had never opened.
 */
describe('a sign-off belongs to the person who made it', () => {
  const store: Record<string, string> = {}
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k]
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v },
      removeItem: (k: string) => { delete store[k] },
    })
  })

  it('does not hand one person the ticks another made in the same browser', async () => {
    const m = await import('./the-setup-steps-you-have-checked')
    m.rememberYouCheckedIt('g1', 'demo-lead', 1)
    m.rememberYouCheckedIt('g1', 'demo-lead', 2)
    expect(m.stepsYouHaveChecked('g1', 'demo-lead')).toEqual([1, 2])
    expect(m.stepsYouHaveChecked('g1', 'ada-the-admin')).toEqual([])
  })

  it('and keeps them apart per check-in as well', async () => {
    const m = await import('./the-setup-steps-you-have-checked')
    m.rememberYouCheckedIt('g1', 'ada', 3)
    expect(m.stepsYouHaveChecked('g2', 'ada')).toEqual([])
  })

  /** Signed out, there is no person - and a tick must not then land in everybody's bucket. */
  it('and a missing person is its own bucket rather than a shared one', async () => {
    const m = await import('./the-setup-steps-you-have-checked')
    m.rememberYouCheckedIt('g1', undefined, 4)
    expect(m.stepsYouHaveChecked('g1', 'ada')).toEqual([])
    expect(m.stepsYouHaveChecked('g1', undefined)).toEqual([4])
  })
})
