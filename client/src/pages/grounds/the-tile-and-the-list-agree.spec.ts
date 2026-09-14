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
 *
 * AND THE SENTENCE IS GONE, BECAUSE THE LIST STOPPED HOLDING BOTH PILES.
 *
 * "The filter is not visible anywhere" - correct, and there was not one: the line said "All 12
 * check-ins, including 3 closed" over a list with the closed ones mixed through it, which explains
 * the count and leaves somebody scrolling for the three they wanted. It is two tabs now, and the
 * tile cannot disagree with a list that only ever shows the pile the tabs name.
 *
 * So what is asserted below is the RULE rather than the sentence that used to keep it: the list
 * renders the filtered set, and the filter is drawn from the same `active` the tile counts. A
 * second source for "which ones are running" is how these two came apart in the first place.
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

  it('and the list renders the filtered pile, never every row', () => {
    expect(CODE).toMatch(/visibleGrounds\.map\(g => <GroundCard/)
    expect(CODE).not.toMatch(/sortedGrounds\.map\(g => <GroundCard/)
  })

  it('and the filter is drawn from the same `active` the tile counts', () => {
    /* A second source for "which ones are running" is how these two came apart the first time. */
    expect(CODE).toMatch(/const openIds = new Set\(active\.map/)
    expect(CODE).toMatch(/showing === 'closed' \? !openIds\.has\(g\.id\) : openIds\.has\(g\.id\)/)
  })

  it('the tile still counts what it says it counts', () => {
    /* The fix is the reconciliation, not changing either number. */
    expect(CODE).toMatch(/\{ val: active\.length,\s*label: 'In progress' \}/)
  })

  it('and the tabs stay out of the way when there is nothing to reconcile', () => {
    /* With nothing closed the two agree, and two tabs where one is always empty is furniture. */
    const guard = CODE.slice(CODE.indexOf('{closedCount > 0 && ('))
    expect(guard.slice(0, 300)).toContain("role=\"tablist\"")
  })
})
