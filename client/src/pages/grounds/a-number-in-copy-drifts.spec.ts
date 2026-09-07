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
    expect(stripped).toMatch(/\{HOW_MANY_NAMED_SITUATIONS\} \{theWords\.intro\}/)
  })

  it('and the words it introduces still say "situations", on both paths', () => {
    /* Comments stripped: the doc comment at the top of that file QUOTES the old sentence to
       explain what was wrong with it, and a guard a comment can satisfy is not a guard. */
    const words = readFileSync(join(__dirname, 'whose-situation-is-it.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')
    expect((words.match(/situations, grouped by/g) || []).length).toBe(2)
  })

  it('and no spelled-out number is left in that line', () => {
    expect(stripped).not.toMatch(/Twenty(-one|-two)? situations/i)
  })

  it('matches what the catalogue actually holds', () => {
    expect(HOW_MANY_SITUATIONS).toBe(22)
  })

  it('and the picker quotes the NAMED count, not the one that includes the escape hatch', () => {
    /* "21 situations, pick the closest fit" is true. Twenty-two counted the describe-your-own
       card, which is now the pick above them rather than one of them. */
    expect(HOW_MANY_NAMED_SITUATIONS).toBe(21)
    expect(HOW_MANY_NAMED_SITUATIONS).toBe(HOW_MANY_SITUATIONS - 1)
  })
})
