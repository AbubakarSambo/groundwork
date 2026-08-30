import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * ONE QUESTION PER STEP, AND THE COACH IS A DECISION RATHER THAN A CARD.
 *
 * Step one used to be four things at once: who the check-in is for, twenty-one situation cards, the
 * coach, and a free-text box that appeared underneath if you picked the last card. Her reading of
 * it: "describe your own situation and find a coach are a bit off and merge in a weird way."
 *
 * The order she asked for, and the reason each is where it is:
 *
 *   1. who it is for      - decides what everything after it is asking you for
 *   2. the situation      - the cards, or the option to describe it yourself
 *   3. a coach            - asked BEFORE the situation is written down, because the point of a
 *                           coach is help shaping what you are about to set up
 *   4. describe it        - only on the free-text path; a card already says what this is
 *
 * The coach is paid, like the integration API, and greyed the same way rather than hidden. Somebody
 * on the free plan sees what it is, what it costs, and the two real answers - go and pay, or carry
 * on without one.
 */
const PAGE = readFileSync(join(__dirname, 'CreateGroundPage.tsx'), 'utf8')

describe('the setup flow asks one thing at a time', () => {
  it('has a step for each of the four questions', () => {
    for (const n of [1, 2, 3, 4]) {
      expect(PAGE).toMatch(new RegExp(`STEP ${n}:`))
    }
    expect(PAGE).toContain("1: 'Who it is for'")
    expect(PAGE).toContain("2: 'The situation'")
    expect(PAGE).toContain("3: 'A coach'")
    expect(PAGE).toContain("4: 'Describe it'")
  })

  it('gates the coach on a paid plan, and greys it rather than hiding it', () => {
    /*
     * Hiding it would be worse than the old placement: somebody who would pay for a coach would
     * never learn there is one. Dimmed and unclickable says what it is and what it would cost.
     */
    expect(PAGE).toContain('const onAPaidPlan =')
    expect(PAGE).toContain('Working with a coach is part of a paid plan')
    expect(PAGE).toMatch(/opacity: onAPaidPlan \? 1 : 0\.55/)
    expect(PAGE).toMatch(/pointerEvents: onAPaidPlan \? 'auto' : 'none'/)
  })

  it('offers pay or skip, because a wall with one exit is not a choice', () => {
    const notice = PAGE.slice(PAGE.indexOf('Working with a coach is part of a paid plan'))
    expect(notice.slice(0, 1800)).toContain('See the plans')
    expect(notice.slice(0, 1800)).toContain('Skip this')
  })

  it('skips the free-text step when a card already said what this is', () => {
    /*
     * Forward and back both, or Back lands on a screen the person was never shown.
     *
     * ASSERTED ON THE BRANCH, NOT THE WHOLE LINE. This pinned the exact text of the `next`
     * expression, so adding a second skip beside the first turned it red without anything about
     * this rule having changed. A guard that fails when a neighbour moves is a guard people learn
     * to edit rather than read.
     */
    const forward = PAGE.slice(PAGE.indexOf('const next = step === 3'), PAGE.indexOf('const next = step === 3') + 400)
    expect(forward).toContain('step === 3')
    expect(forward).toContain('(describing ? 4 : 5)')
  })

  it('and skips the coach step for anybody who cannot use it', () => {
    /*
     * On the free plan that step showed two cards to say one thing - coaching is paid, and a coach
     * card dimmed and inert beneath it - in the middle of setting a check-in up, to somebody who
     * could act on neither. Forward and back both, again.
     */
    const forward = PAGE.slice(PAGE.indexOf('const next = step === 3'), PAGE.indexOf('const next = step === 3') + 400)
    expect(forward).toContain('step === 2 && !onAPaidPlan')
    expect(PAGE).toContain("setStep(onAPaidPlan ? 3 : 2)")
  })

  it('asks for one thing per step rather than everything at once', () => {
    /*
     * The old bar gated on situation AND moment AND the description together, with one line of help
     * trying to say which was missing. Each step now has its own reason for being blocked.
     */
    expect(PAGE).toMatch(/step === 1 \? alsoAParty === null/)
    expect(PAGE).toMatch(/step === 2 \? \(!scenario \|\| !moment\)/)
    expect(PAGE).toMatch(/step === 4 \? needsRouting/)
  })

  it('still ends where it always did, at the brief that creates the check-in', () => {
    expect(PAGE).toContain('const TOTAL_STEPS = 8')
    expect(PAGE).toContain("8: 'The brief'")
    expect(PAGE).toMatch(/\{step === 8 && \(/)
  })
})
