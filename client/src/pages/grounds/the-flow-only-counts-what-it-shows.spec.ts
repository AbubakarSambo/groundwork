import { describe, it, expect } from 'vitest'
import { STAGE, stepsThisPersonSees, stepAfter, stepBefore } from './the-steps-this-person-sees'

/**
 * THE FLOW IS THE PICKER AND THEN A CONVERSATION.
 *
 * This file used to be about counting eight steps honestly - a person on the ordinary path was told
 * "Step 5 of 8" directly after step 3, because skipping was worked out in three places and counting
 * in a fourth. That was worth fixing and it is not what this flow is any more.
 *
 * Her words, over a screenshot of "Step 5 of 5 - The brief": "this page should not really exist
 * based on the conversation we have been having. the entry chat and the wizard should be similar,
 * right?"
 *
 * They should. The six screens after the picker asked for exactly what the setup conversation
 * already asks for and extracts - what this is about, who is in it, why now, how long, how often,
 * the brief - and asked for them worse, then ended on an admin board instead of on the person's own
 * check-in and a report. So the picker hands over, and what remains here is the picker, the
 * describe-your-own screen it can lead to, the coach on a paid plan, and billing when it refuses.
 *
 * The counting rules still matter and are still held: a step nobody is shown must not be counted,
 * landed on by Back, or stepped over by arithmetic that forgot it.
 */
function stepsSeen(o: { onAPaidPlan: boolean; describingOwn: boolean; billingSettled: boolean }) {
  return stepsThisPersonSees({
    onAPaidPlan: o.onAPaidPlan,
    describingOwnSituation: o.describingOwn,
    billingSettledAndFree: o.billingSettled,
  })
}

const ORDINARY = { onAPaidPlan: false, describingOwn: false, billingSettled: true }

describe('the setup flow counts what it shows', () => {
  it('THE COMMON PATH IS ONE SCREEN', () => {
    /* Free plan, picked a card, nothing to pay: the picker, and then the conversation. */
    expect(stepsSeen(ORDINARY)).toEqual([STAGE.situation])
  })

  it('and the billing screen is still there when it is actually refusing', () => {
    /*
     * A screen whose only content is that it has nothing to say is not worth showing. A refusal is,
     * and it must come BEFORE the work rather than after it - which now means before the
     * conversation rather than before six more forms.
     */
    expect(stepsSeen({ ...ORDINARY, billingSettled: false })).toContain(STAGE.plan)
    expect(stepsSeen(ORDINARY)).not.toContain(STAGE.plan)
  })

  it('keeps the free-text screen for somebody describing their own situation', () => {
    expect(stepsSeen({ ...ORDINARY, describingOwn: true })).toContain(STAGE.describe)
    expect(stepsSeen(ORDINARY)).not.toContain(STAGE.describe)
  })

  it('and the coach only on a paid plan', () => {
    expect(stepsSeen({ ...ORDINARY, onAPaidPlan: true })).toContain(STAGE.coach)
    expect(stepsSeen(ORDINARY)).not.toContain(STAGE.coach)
  })

  it('never shows the screens whose questions the conversation now asks', () => {
    /*
     * THE POINT OF THE WHOLE CHANGE, asserted rather than described. Every one of these asked for
     * something the setup conversation extracts, and asking twice is how a person learns that
     * nothing they said was heard.
     */
    for (const o of [
      ORDINARY,
      { onAPaidPlan: true, describingOwn: true, billingSettled: false },
      { onAPaidPlan: false, describingOwn: true, billingSettled: true },
    ]) {
      const steps = stepsSeen(o)
      expect(steps).not.toContain(STAGE.timeline)
      expect(steps).not.toContain(STAGE.people)
      expect(steps).not.toContain(STAGE.brief)
      expect(steps).not.toContain(STAGE.who)
    }
  })

  it('forward never lands on a step this person is not shown', () => {
    for (const o of [ORDINARY, { onAPaidPlan: true, describingOwn: true, billingSettled: false }]) {
      const steps = stepsSeen(o)
      for (const s of steps) expect(steps).toContain(stepAfter(steps, s))
    }
  })

  it('and back never does either', () => {
    for (const o of [ORDINARY, { onAPaidPlan: true, describingOwn: true, billingSettled: false }]) {
      const steps = stepsSeen(o)
      for (const s of steps) {
        const previous = stepBefore(steps, s)
        if (previous !== null) expect(steps).toContain(previous)
      }
    }
  })

  it('the last step has no next, which is how the page knows to hand over', () => {
    const steps = stepsSeen(ORDINARY)
    const last = steps[steps.length - 1]
    expect(stepAfter(steps, last)).toBe(last)
  })
})
