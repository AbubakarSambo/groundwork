import { describe, it, expect } from 'vitest'
import { STAGE, stepsThisPersonSees, stepAfter, type WhoIsSettingUp } from './the-steps-this-person-sees'
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
  *
 * THE STEPS ARE NAMED NOW, AND THESE ASSERTIONS FOLLOW THEM.
 *
 * They used to pin numbers - `step === 3`, `setStep(onAPaidPlan ? 3 : 2)` - which is what the flow
 * itself used. Both have moved to `STAGE.coach`, `STAGE.situation` and so on, so that a renumber is
 * one edit in one object rather than thirty-three edits that all still compile if you miss one. The
 * numbers behind the names are unchanged; this file asserts the same rules about the same screens.
 *
 * Which is also the point of the note further down about not pinning a whole expression: a guard
 * that fails when a neighbour moves is one people learn to edit rather than read.
*/
const PAGE = readFileSync(join(__dirname, 'CreateGroundPage.tsx'), 'utf8')

describe('the setup flow asks one thing at a time', () => {
  it('has a step for each of the four questions', () => {
    for (const n of [1, 2, 3, 4]) {
      expect(PAGE).toMatch(new RegExp(`STEP ${n}:`))
    }
    expect(PAGE).toContain("[STAGE.who]: 'Who it is for'")
    expect(PAGE).toContain("[STAGE.situation]: 'The situation'")
    expect(PAGE).toContain("[STAGE.coach]: 'A coach'")
    expect(PAGE).toContain("[STAGE.describe]: 'Describe it'")
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

  /*
   * THESE TWO ASK THE ORDERING, NOT THE PAGE'S SOURCE.
   *
   * They pinned the text of the `next` expression - `(describing ? 4 : 5)` and all - so replacing
   * that arithmetic with a list turned them red while both rules held perfectly. The first one's
   * own comment already said a guard that fails when a neighbour moves is one people learn to edit
   * rather than read; it had been loosened once instead of being pointed at the behaviour.
   *
   * The ordering is `the-steps-this-person-sees.ts` now, so they ask it directly. Forward and back
   * both, which is what these were always about: Back must not land on a screen nobody was shown.
   */
  const seen = (o: Partial<WhoIsSettingUp>) => stepsThisPersonSees({
    onAPaidPlan: false, describingOwnSituation: false, billingSettledAndFree: true,
    somebodyElseLeads: false, ...o,
  })

  it('does not ask a setter for the brief or the description, because they write neither', () => {
    /*
     * Step 1's third answer is "Someone else sets the context": they write what it is about, they
     * check in, they see the results. The flow did not branch on it, so the setter was walked
     * through "Describe it" and then "What is this about? Your version of the brief" - two screens
     * asking for the one thing they had just said was not theirs.
     */
    const setter = seen({ somebodyElseLeads: true, describingOwnSituation: true })
    expect(setter).not.toContain(STAGE.brief)
    expect(setter).not.toContain(STAGE.describe)
    /* And what a setter IS for is untouched. */
    expect(setter).toContain(STAGE.situation)
    expect(setter).toContain(STAGE.timeline)
    expect(setter).toContain(STAGE.people)
  })

  it('and the people step is the end of the flow for them, with nothing after it', () => {
    /* The button on that step used to hardcode the brief as its next screen. If the last step has
       no next, that button has to start the check-in instead - see stepAfter's contract. */
    const setter = seen({ somebodyElseLeads: true })
    expect(setter[setter.length - 1]).toBe(STAGE.people)
    expect(stepAfter(setter, STAGE.people)).toBe(STAGE.people)
  })

  it('skips the free-text step when a card already said what this is', () => {
    expect(seen({ describingOwnSituation: false })).not.toContain(STAGE.describe)
    expect(seen({ describingOwnSituation: true })).toContain(STAGE.describe)
    // Back is the same list read backwards, so it cannot land on the skipped step either.
    const path = seen({ describingOwnSituation: false })
    expect(path[path.indexOf(STAGE.timeline) - 1]).toBe(STAGE.situation)
  })

  it('and skips the coach step for anybody who cannot use it', () => {
    /*
     * On the free plan that step showed two cards to say one thing - coaching is paid, and a coach
     * card dimmed and inert beneath it - in the middle of setting a check-in up, to somebody who
     * could act on neither.
     */
    expect(seen({ onAPaidPlan: false })).not.toContain(STAGE.coach)
    expect(seen({ onAPaidPlan: true })).toContain(STAGE.coach)
    const path = seen({ onAPaidPlan: false })
    expect(path[path.indexOf(STAGE.situation) - 1]).toBe(STAGE.who)
  })

  it('asks for one thing per step rather than everything at once', () => {
    /*
     * The old bar gated on situation AND moment AND the description together, with one line of help
     * trying to say which was missing. Each step now has its own reason for being blocked.
     */
    expect(PAGE).toMatch(/step === STAGE\.who \? alsoAParty === null/)
    expect(PAGE).toMatch(/step === STAGE\.situation \? \(!scenario \|\| !moment\)/)
    expect(PAGE).toMatch(/step === STAGE\.describe \? needsRouting/)
  })

  it('still ends where it always did, at the brief that creates the check-in', () => {
    /*
     * The count is derived rather than typed, so this asserts the derivation and the stage rather
     * than the literal 8. A number typed in two places is what let the dot comment say "(6)" while
     * the constant said 8.
     *
     * It derives from the steps THIS PERSON sees, not from every stage that exists: three of the
     * eight are conditional, so `Object.keys(STAGE).length` told somebody they were on "Step 5 of
     * 8" when they would be shown six screens.
     */
    expect(PAGE).toContain('const totalStepsForThisPerson = visibleSteps.length')
    expect(PAGE).not.toContain('const TOTAL_STEPS')
    expect(PAGE).toContain("[STAGE.brief]: 'The brief'")
    // The brief is last for everyone, whichever steps they were shown.
    for (const o of [{}, { onAPaidPlan: true }, { describingOwnSituation: true }, { billingSettledAndFree: false }]) {
      const path = seen(o)
      expect(path[path.length - 1]).toBe(STAGE.brief)
    }
    expect(PAGE).toMatch(/\{step === STAGE\.brief && \(/)
  })
})
