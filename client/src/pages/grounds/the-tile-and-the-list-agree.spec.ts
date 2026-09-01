import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * "IN PROGRESS 9" ABOVE TEN CARDS.
 *
 * The tile counts `active.length` - check-ins that are running. The list beneath shows every
 * check-in, closed ones included. While nothing is closed the two agree and nobody notices. Close
 * one and the dashboard reads "IN PROGRESS 9" directly above ten cards with nothing saying why.
 *
 * REPRODUCED, NOT REASONED. I closed a check-in in the database and looked: tile 9, ten cards, the
 * closed one still among them.
 *
 * This is the defect `a-counter-must-count-what-it-says` is named for - a counter whose label
 * promises one thing and whose value measures another - and the same shape as "0 of 2 checked in"
 * over a roster showing two people checked in, which this product fixed the same day.
 *
 * BOTH NUMBERS ARE RIGHT AND BOTH ARE WORTH SHOWING. What was missing is the sentence that makes
 * them agree. Removing the tile would have lost "how many are actually running", which the list
 * cannot answer at a glance.
 */
const CODE = readFileSync(join(__dirname, 'GroundsListPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

describe('the tile and the list do not argue', () => {
  it('reads the real file, so an empty one cannot pass', () => {
    expect(CODE.length).toBeGreaterThan(3000)
  })

  it('the difference between them is computed, not left for the reader', () => {
    expect(CODE).toMatch(/const closedCount = grounds\.length - active\.length/)
  })

  it('and the list says what it holds whenever they differ', () => {
    expect(CODE).toMatch(/\{closedCount > 0 && \(/)
    expect(CODE).toMatch(/All \{sortedGrounds\.length\} check-ins, including \{closedCount\} closed/)
  })

  it('the tile still counts what it says it counts', () => {
    /* The fix is the reconciliation, not changing either number. */
    expect(CODE).toMatch(/\{ val: active\.length,\s*label: 'In progress' \}/)
  })

  it('and the line stays out of the way when there is nothing to reconcile', () => {
    /* With nothing closed the two agree, and a sentence explaining a difference that does not
       exist is its own kind of noise. */
    const guard = CODE.slice(CODE.indexOf('{closedCount > 0 && ('))
    expect(guard.slice(0, 200)).toContain('All {sortedGrounds.length} check-ins')
  })
})
