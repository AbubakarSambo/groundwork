import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * ONE GOOGLE LOGO PER BUTTON.
 *
 * The sign-up button carried two, stacked. Added when the mark went in and never seen, because that
 * change was checked on the sign-in half of the same page - the two buttons are near-identical and
 * only one of them was looked at.
 */
/*
 * Comments stripped: the note explaining why the mark exists says "Continue with Google" too, and
 * a guard that cannot tell prose from a button counted that one and found no logo before it.
 */
const PAGE = readFileSync(join(__dirname, 'AuthPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

describe('every Continue with Google button', () => {
  it('carries exactly one mark', () => {
    for (const m of PAGE.matchAll(/Continue with Google/g)) {
      /* The button opens somewhere before the label; a mark belongs between the two, once. */
      const opens = PAGE.lastIndexOf('<button', m.index!)
      const inThisButton = PAGE.slice(opens, m.index!).match(/<GoogleMark \/>/g) ?? []
      expect(inThisButton).toHaveLength(1)
    }
  })

  it('and there is a button to check', () => {
    expect(PAGE.match(/Continue with Google/g)!.length).toBeGreaterThanOrEqual(2)
  })
})
