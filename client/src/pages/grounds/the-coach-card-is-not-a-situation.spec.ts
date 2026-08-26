import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { COACH_CARD, SCENARIO_GROUPS, SCENARIO_FACTS, SCENARIO_KEYS } from '@/lib/scenario-catalog'
import { MIN_INTENTION_LENGTH } from '@/api/coach'

/**
 * THE TWENTY-FIRST CARD MUST NOT BE ABLE TO BEHAVE LIKE A SITUATION.
 *
 * It exists for the person the other twenty cannot help: told to set this up, looking at a wall of
 * situations, with no idea which is theirs. Picking one at random gives them the wrong interview.
 *
 * But it creates nothing - no ground, no scenario, no check-in, nobody invited - so it deliberately
 * sits outside every structure the guards use to describe a situation. If it ever appears in
 * SCENARIO_GROUPS or SCENARIO_FACTS, the guards asserting that every group holds situations and every
 * situation has a cadence would start passing for something that has neither.
 */
describe('asking for a coach', () => {
  it('is not one of the twenty situations', () => {
    expect(SCENARIO_KEYS).not.toContain(COACH_CARD.key as never)
    expect(SCENARIO_FACTS).not.toHaveProperty(COACH_CARD.key)
  })

  it('and is not one of the six groups', () => {
    expect(SCENARIO_GROUPS.map(g => g.key as string)).not.toContain(COACH_CARD.key)
  })

  it('says plainly that nothing is created and nobody is contacted', () => {
    // The single most important sentence on the card. Somebody reaching for a coach is often reaching
    // for it because they are afraid of setting the wrong thing in motion.
    expect(COACH_CARD.whatHappens).toMatch(/[Nn]othing is created/)
    expect(COACH_CARD.whatHappens).toMatch(/nobody on your team is contacted/i)
  })

  it('shows what it costs, and that the software works without it', () => {
    expect(COACH_CARD.cost).toContain('$5,000')
    expect(COACH_CARD.cost).toContain('$500')
    expect(COACH_CARD.cost).toMatch(/works without it/)
  })

  describe('on the picker', () => {
    const src = readFileSync(join(__dirname, 'CreateGroundPage.tsx'), 'utf8')

    it('renders outside the radiogroup, so it cannot be chosen as a situation', () => {
      /**
       * Positional, and that is the point: the card must come after the radiogroup closes. Rendering it
       * inside would make it selectable, and selecting it would send a scenario that does not exist.
       */
      const radioEnd = src.indexOf('</div>', src.indexOf('role="radiogroup" aria-label="What is this for?"'))
      const coachAt = src.indexOf('id="cg-coach"')
      expect(coachAt).toBeGreaterThan(radioEnd)
      expect(src.slice(radioEnd, coachAt)).not.toMatch(/role="radio"[\s\S]{0,400}cg-coach/)
    })

    it('shows the price before the send button, not after', () => {
      const cost = src.indexOf('COACH_CARD.cost')
      const send = src.indexOf('Send request')
      expect(cost).toBeGreaterThan(-1)
      expect(cost).toBeLessThan(send)
    })

    it('will not send an intention too short to reply to', () => {
      expect(src).toMatch(/coach\.intention\.trim\(\)\.length < MIN_INTENTION_LENGTH/)
    })

    it('and requires the organisation, which is the useful filter', () => {
      expect(src).toMatch(/!coach\.orgName\.trim\(\)/)
    })
  })

  it('enforces the same minimum the form advertises', () => {
    // The form counts down to this number in front of the person, so it must be the one that applies.
    expect(MIN_INTENTION_LENGTH).toBeGreaterThan(20)
  })
})
