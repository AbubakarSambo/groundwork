import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * B-153. The deep page audit found four buttons offering to correct a person's own record, in
 * three different wordings: "This is not what I said" (twice), "Something here isn't right", and
 * "Something here is not what I said". The prototype's own screen for this
 * (docs/prototype/screens/B4-reports-and-sharing/own-report.txt) uses "Something here isn't
 * right", which a-report-you-cannot-argue-with.spec.ts already pins - so every surface now says
 * that, not the bug log's own suggested rewrite, which did not match the prototype.
 *
 * Also fixed here: WhatWasTakenFromWhatYouSaid.tsx called Groundwork "the product", and split one
 * idea into two short sentences ("Not what you typed. What the product took from it...").
 */
const read = (...p: string[]) => readFileSync(join(__dirname, ...p), 'utf8')

const SURFACES = {
  'the just-finished panel': read('components', 'gw', 'TheCheckInYouJustFinished.tsx'),
  'the done page': read('components', 'gw', 'checkin', 'TheDonePage.tsx'),
  'what was taken from what you said': read('components', 'gw', 'WhatWasTakenFromWhatYouSaid.tsx'),
  'the session report page': read('pages', 'report', 'SessionReportPage.tsx'),
}

describe('B-153: one wording for "correct my record", the prototype\'s own', () => {
  it('every surface says "Something here isn’t right", never the other two wordings', () => {
    for (const [name, src] of Object.entries(SURFACES)) {
      expect(src, name).toContain('Something here isn’t right')
      expect(src, name).not.toMatch(/This is not what I said/)
      expect(src, name).not.toMatch(/Something here is not what I said/)
    }
  })

  it('never calls Groundwork "the product"', () => {
    expect(SURFACES['what was taken from what you said']).not.toMatch(/\bthe product\b/i)
    expect(SURFACES['what was taken from what you said']).toContain('These lines are what Groundwork took from what you wrote. Every count on this page is built from them.')
  })
})
