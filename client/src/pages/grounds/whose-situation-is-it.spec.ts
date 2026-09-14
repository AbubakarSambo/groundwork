import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { theWordsForPickingASituation } from './whose-situation-is-it'

/**
 * THE BRANCH THIS FILE USED TO HOLD IS GONE, AND SO ARE THE TESTS FOR IT.
 *
 * It was reported from the screen: "if someone else is setting up, the next step is confusing, not
 * your situation but the situation." Step 1's third answer - "Someone else sets the context" - was
 * removed on her call ("I think we should remove the whole org admin setting a context and handing
 * it over to a lead. It seems like it is confusing"), so nobody reaches this step describing
 * somebody else's situation any more.
 *
 * Deleting the assertions rather than leaving them passing against a dead branch is the point:
 * tests kept for a path nothing can take are how a codebase comes to look better covered than it
 * is. What remains is what the step must still say, and the check that the page actually uses it.
 */
const words = theWordsForPickingASituation()

describe('the words on the situation step', () => {
  it('speak in the second person, because everybody here writes their own context now', () => {
    expect(words.intro).toContain('the question you are actually asking')
    /* Renamed with the rest of the catalogue: every card names the job now rather than the
       situation, and this one told somebody what they would have to DO to use it. */
    expect(words.describeOwnLabel).toBe('Work Through Something Else')
  })

  it('say what a situation actually runs like, which is the part people get wrong', () => {
    /* Not a form to fill in: an objective agreed at the start, then check-ins against it. */
    expect(words.intro).toMatch(/objective agreed at the start/)
    expect(words.intro).toMatch(/it sets the questions people are asked and how often/)
  })
})

describe('the page uses it', () => {
  const src = readFileSync(join(__dirname, 'CreateGroundPage.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\}|\/\/[^\n]*/g, '')

  it('for the intro and the one card that is about the reader', () => {
    expect(src).toMatch(/\{theWords\.intro\}/)
    expect(src).toMatch(/theWords\.describeOwnLabel/)
  })

  it('and leaves every named situation alone, because those are facts about the product', () => {
    expect(src).toMatch(/card\.scenario === 'OPEN_READ' \? theWords\.describeOwnLabel : card\.label/)
  })

  it('no longer offers handing the check-in to somebody else to set the context', () => {
    /* The whole reason the branch above is gone. If the answer comes back, this file is wrong. */
    expect(src).not.toMatch(/Someone else sets the context/)
    expect(src).not.toMatch(/runByOther/)
  })
})
