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

/*
 * U.5: THE TILE AND THE TABS WENT, AND THE RULE STAYS. The list is now the prototype's sections, each
 * with its own count ("You run 3 open"), and finished check-ins under "Finished". What this guarded
 * is that a count and the rows under it come from one source, so they cannot disagree.
 */
describe('the count and the list do not argue', () => {
  it('reads the real file, so an empty one cannot pass', () => {
    expect(CODE.length).toBeGreaterThan(3000)
  })

  it('open and finished are split once, by one rule', () => {
    expect(CODE).toMatch(/const open = rows\.filter\(r => !isFinished\(r\.g\)\)/)
    expect(CODE).toMatch(/const finished = rows\.filter\(r => isFinished\(r\.g\)\)/)
  })

  it('and each section counts the very rows it draws', () => {
    /*
     * UPDATED, GROUP 2 REBUILD: the page's own local `Section({ title, count })` and a
     * `CheckInsTable` fed a `rows` array are gone - each heading is now the SHARED `Section`
     * (prop `note`, not `count`), and the shared `CheckInsTable` (components/gw/ui) takes its rows
     * as children (`CheckInsRows`, which renders one `CheckInRow` per row), not a `rows` prop. The
     * finding this test protects - the count printed and the rows drawn under it come from the same
     * variable, so they cannot disagree - still holds, checked against the new shape.
     */
    for (const [title, pile] of [['You run', 'youRun'], ['You’re in', 'youreIn']]) {
      expect(CODE).toMatch(new RegExp(`<Section heading="${title}" note=\\{\`\\$\\{${pile}\\.length\\} open\`\\}[^>]*>\\s*<CheckInsTable label="${title}"><CheckInsRows rows=\\{${pile}\\}`))
    }
  })

  it('and nothing is in two sections', () => {
    expect(CODE).toMatch(/const others = byWhatNeedsYou\(open\.filter\(r => !youRun\.includes\(r\) && !youreIn\.includes\(r\)\)\)/)
  })
})
