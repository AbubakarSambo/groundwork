import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { HOW_MANY_SITUATIONS, HOW_MANY_NAMED_SITUATIONS } from '@/lib/scenario-catalog'

/**
 * The set-up wizard opened with "Twenty situations, grouped by the question you are actually
 * asking". There are twenty-two. Two were added - an agreement before it is signed, and one that
 * is running - and the sentence counting them was not part of that change, because nothing tied
 * the number to the list.
 *
 * The comment beside the search count made it worse by justifying it: twenty-one cards covering
 * twenty situations, because COHORT_ONBOARDING shared COHORT_CHECK's situation. They are separate
 * scenarios now, so a wrong number had a stale explanation attached, which is how a wrong number
 * survives being read.
 */
const page = readFileSync(join(__dirname, 'CreateGroundPage.tsx'), 'utf8')
const stripped = page.replace(/\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\}|\/\/[^\n]*/g, '')

describe('how many situations the page claims', () => {
  it('is counted from the catalogue, not written into the sentence', () => {
    /* The words after the number now depend on whose situation it is (whose-situation-is-it.ts),
       so the assertion is on the NUMBER coming from the catalogue rather than on the sentence it
       introduces - which is what this test was always about. */
    expect(stripped).toMatch(/\{namedCardCount\} \{theWords\.intro\}/)
  })

  it('and the words it introduces still say "situations"', () => {
    /* Comments stripped: the doc comment at the top of that file QUOTES the old sentence to
       explain what was wrong with it, and a guard a comment can satisfy is not a guard. */
    const words = readFileSync(join(__dirname, 'whose-situation-is-it.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')
    /* One wording, not two. The second was for the "Someone else sets the context" answer, which
       is gone - see whose-situation-is-it.ts. */
    expect((words.match(/situations, grouped by/g) || []).length).toBe(1)
  })

  it('and no spelled-out number is left in that line', () => {
    expect(stripped).not.toMatch(/Twenty(-one|-two)? situations/i)
  })

  it('matches what the catalogue actually holds', () => {
    expect(HOW_MANY_SITUATIONS).toBe(22)
  })

  it('and the picker quotes the NAMED count, not the one that includes the escape hatch', () => {
    expect(HOW_MANY_NAMED_SITUATIONS).toBe(21)
    expect(HOW_MANY_NAMED_SITUATIONS).toBe(HOW_MANY_SITUATIONS - 1)
  })

  it('and the sentence counts CARDS, which is what the groups under it count', () => {
    /*
     * The catalogue counts scenarios; the picker offers cards, and COHORT_CHECK has two of them.
     * The page said 21 while its own dropdown summed to 22. Both numbers now come off the same
     * array, so the only way to make them disagree is to count something else on purpose.
     */
    const page = readFileSync(join(__dirname, 'CreateGroundPage.tsx'), 'utf8')
    const cards = [...page.matchAll(/cardKey:\s*'[A-Z_]+',\s*scenario:\s*'([A-Z_]+)'/g)].map(m => m[1])
    const named = cards.filter(s => s !== 'OPEN_READ')
    expect(named.length).toBe(22)
    expect(new Set(named).size).toBe(HOW_MANY_NAMED_SITUATIONS)
  })
})
