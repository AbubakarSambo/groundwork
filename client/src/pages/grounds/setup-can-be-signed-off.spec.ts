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
    expect(PAGE).toContain('{open && onCheck && (')
    expect(PAGE).toContain('I have checked this')
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
