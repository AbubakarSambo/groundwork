import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { HOW_MANY_SITUATIONS } from '@/lib/scenario-catalog'

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
    expect(stripped).toMatch(/\{HOW_MANY_SITUATIONS\} situations, grouped by the question/)
  })

  it('and no spelled-out number is left in that line', () => {
    expect(stripped).not.toMatch(/Twenty(-one|-two)? situations/i)
  })

  it('matches what the catalogue actually holds', () => {
    expect(HOW_MANY_SITUATIONS).toBe(22)
  })
})
