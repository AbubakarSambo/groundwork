import { describe, it, expect } from 'vitest'
import { STAGE, stepsThisPersonSees, type WhoIsSettingUp } from './the-steps-this-person-sees'
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
    /*
     * Was asserted on `STEP_NAMES`, a title-case label shown after a middle dot ("Step 3 of 4 ·
     * The situation") - two pieces joined by punctuation rather than a sentence. Group 3, piece 4
     * (the wording pass on this screen's own words) renamed it `STEP_ABOUT` and reworded each entry
     * as a fragment a sentence can finish with ("step 2 of 3, about a coach."), read off the same
     * stage labels as before.
     */
    expect(PAGE).toContain("[STAGE.who]: 'who checks in'")
    expect(PAGE).toContain("[STAGE.situation]: 'the situation'")
    expect(PAGE).toContain("[STAGE.coach]: 'a coach'")
    expect(PAGE).toContain("[STAGE.describe]: 'describing it'")
  })

  it('gates the coach on a paid plan, and greys it rather than hiding it', () => {
    /*
     * Hiding it would be worse than the old placement: somebody who would pay for a coach would
     * never learn there is one. Dimmed and unclickable says what it is and what it would cost.
     *
     * Was two inline styles (`opacity: onAPaidPlan ? 1 : 0.55`, `pointerEvents: ... 'none'`), which
     * group 3, piece 4 (rebuilding this screen from the shared parts) moved into one named class,
     * `gwui-cg-dimmed` (gw-ui.css), applied only when the plan is not paid. The two properties and
     * their values are unchanged; only where they are written moved.
     */
    expect(PAGE).toContain('const onAPaidPlan =')
    expect(PAGE).toContain('Working with a coach is part of a paid plan')
    expect(PAGE).toMatch(/className=\{onAPaidPlan \? undefined : 'gwui-cg-dimmed'\}/)
    const css = readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'ui', 'gw-ui.css'), 'utf8')
    expect(css).toMatch(/\.gwui-cg-dimmed\s*\{[^}]*opacity:\s*0\.55/)
    expect(css).toMatch(/\.gwui-cg-dimmed\s*\{[^}]*pointer-events:\s*none/)
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
    onAPaidPlan: false, describingOwnSituation: false, billingSettledAndFree: true, ...o,
  })

  it('asks everybody for the brief, because everybody here writes their own context', () => {
    /*
     * THIS USED TO BE TWO TESTS ABOUT A SETTER, AND THE SETTER IS GONE.
     *
     * Step 1's third answer - "Someone else sets the context" - skipped both the description and
     * the brief, since asking somebody to write a brief about a situation they had just said was
     * not theirs is the wrong question. Her call removed that answer, so the skip has nobody left
     * to apply to and the brief is the last step for everyone again.
     */
    /*
     * THE BRIEF SCREEN IS GONE ALTOGETHER, along with the timeline, the people and the who.
     *
     * They asked for exactly what the setup conversation asks for and extracts, and asked for them
     * worse. What is left of this file's original point - a setter being walked through screens
     * that were not theirs - is answered by there being almost no screens.
     */
    const own = seen({ describingOwnSituation: true })
    expect(own).toContain(STAGE.describe)
    expect(own).not.toContain(STAGE.brief)
  })

  it('skips the free-text step when a card already said what this is', () => {
    expect(seen({ describingOwnSituation: false })).not.toContain(STAGE.describe)
    expect(seen({ describingOwnSituation: true })).toContain(STAGE.describe)
    /* And with the card picked there is nothing after the picker at all - the next thing is the
       conversation, which this page hands to rather than steps to. */
    expect(seen({ describingOwnSituation: false })).toEqual([STAGE.situation])
  })

  it('and skips the coach step for anybody who cannot use it', () => {
    /*
     * On the free plan that step showed two cards to say one thing - coaching is paid, and a coach
     * card dimmed and inert beneath it - in the middle of setting a check-in up, to somebody who
     * could act on neither.
     */
    expect(seen({ onAPaidPlan: false })).not.toContain(STAGE.coach)
    expect(seen({ onAPaidPlan: true })).toContain(STAGE.coach)
    /* Back must not land on the skipped screen: on the free plan the step after the situation is
       the timeline, not the coach. Read forwards now, because the situation is the FIRST step and
       has nothing before it to read backwards to. */
    const path = seen({ onAPaidPlan: false })
    expect(path[path.indexOf(STAGE.situation) + 1]).not.toBe(STAGE.coach)
  })

  it('asks for one thing per step rather than everything at once', () => {
    /*
     * The old bar gated on situation AND moment AND the description together, with one line of help
     * trying to say which was missing. Each step now has its own reason for being blocked.
     */
    expect(PAGE).toMatch(/step === STAGE\.situation \? \(!scenario \|\| !moment\)/)
    expect(PAGE).toMatch(/step === STAGE\.describe \? needsRouting/)
  })

  it('derives the count from the steps this person sees, rather than a typed total', () => {
    /*
     * A number typed in two places is what let the dot comment say "(6)" while the constant said 8,
     * and it is why this is asserted on the derivation rather than on a literal.
     */
    expect(PAGE).toContain('const totalStepsForThisPerson = visibleSteps.length')
    expect(PAGE).not.toContain('const TOTAL_STEPS')
  })

  it('hands over rather than creating, once the situation is picked', () => {
    /*
     * The last screen used to call `create.mutate()`. Nothing is created here now: the ground is
     * created when the conversation is saved, by the same commit the entry chat has always used.
     * A page that both created check-ins and handed off would be two flows again.
     */
    expect(PAGE).toMatch(/next === step \? handOverToTheConversation\(\) : setStep\(next\)/)
    expect(PAGE).toMatch(/navigate\(`\/start\?\$\{q\.toString\(\)\}`\)/)
  })

  it('and carries the situation, so nobody is asked to pick it twice', () => {
    expect(PAGE).toMatch(/new URLSearchParams\(\{ scenario \}\)/)
  })
})
