import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { SCENARIO_FACTS, recommendedSessions } from '@/lib/scenario-catalog'

/**
 * HOW LONG A SITUATION RUNS IS SAID ONCE.
 *
 * Every card used to carry a hand-written `timelineHint` - "typically 90 days", "typically two
 * weeks" - beside a SCENARIO_FACTS row that already held the real length and cadence. Two copies of
 * one fact, and they had drifted on six of the twenty-three:
 *
 *   a contract renewal   said "two weeks"     and runs 60 days, checking in every two weeks
 *   a big decision       said "one check-in"  and runs 60 days
 *   a new advisor        said "90 days"       and runs a year, monthly
 *   strategy             said "two check-ins" and runs 90 days, monthly
 *   a recognition        said "one check-in"  and runs 30 days
 *   a cohort read        said "ongoing"       and runs 30 days
 *
 * The renewal one is the one that got noticed, and it is the clearest: two weeks is the CADENCE.
 * Read as a length it says you are a fortnight from signing, which is a different situation and not
 * the one the card is for.
 *
 * The whole field was also rendered NOWHERE. Twenty-three values, a spec pinning each one exactly,
 * and no person ever saw any of them - while the card drew its cadence, its length and its number
 * of check-ins from the facts, correctly, a few lines further down.
 *
 * So the field is gone and this is what replaces the spec that pinned it: the facts are the only
 * place a duration lives, and a second copy cannot come back without failing here.
 */
const HERE = dirname(fileURLToPath(import.meta.url))
const ENTRY = readFileSync(join(HERE, 'EntryChatPage.tsx'), 'utf8')
const CARD = readFileSync(join(HERE, '..', '..', 'components', 'gw', 'SituationCard.tsx'), 'utf8')

describe('one duration per situation', () => {
  it('no card carries a duration of its own', () => {
    expect(ENTRY).not.toMatch(/timelineHint/)
    /* Nor the shape it would come back as: a hedged length written into a card. */
    expect(ENTRY).not.toMatch(/typically \d+ days/)
  })

  it('the card reads the length and the cadence off the facts', () => {
    expect(CARD).toMatch(/facts\?\.\s*cadence/)
    expect(CARD).toMatch(/facts\?\.\s*timelineDays/)
    expect(CARD).toMatch(/facts\?\.\s*ongoing/)
  })

  it('and every situation has a length, a cadence and a number of check-ins to draw', () => {
    for (const [scenario, facts] of Object.entries(SCENARIO_FACTS)) {
      expect(facts.cadence, scenario).toBeTruthy()
      expect(facts.timelineDays, scenario).toBeGreaterThan(0)
      expect(recommendedSessions(scenario as any), scenario).toBeGreaterThan(0)
    }
  })

  it('the one-off is one day and one check-in, which is what makes it the one-off', () => {
    expect(SCENARIO_FACTS.SNAPSHOT.timelineDays).toBe(1)
    expect(recommendedSessions('SNAPSHOT')).toBe(1)
  })
})
