import { describe, it, expect } from 'vitest'
import { STAGE, stepsThisPersonSees, stepAfter } from './the-steps-this-person-sees'

/**
 * THE FLOW COUNTS THE STEPS IT SHOWS, AND NO OTHERS.
 *
 * Three of the eight stages are conditional - the coach (paid plans), the free-text description
 * (that path only), and the billing screen. Every part of the flow worked the skipping out for
 * itself: `next` had its own arithmetic, `back` had a special case, and the counter read
 * `Object.keys(STAGE).length`. So somebody on the ordinary path was told "Step 5 of 8" directly
 * after step 3, and Back could land on a screen they were never shown.
 *
 * The billing screen is the one worth removing rather than renumbering. It has two states: "no
 * payment needed, press Continue", and a real refusal with an access-code box. The first is a
 * screen whose only content is that it has nothing to say, in the middle of setting something up.
 *
 * The first version of this spec re-implemented the ordering instead of importing it, so it would
 * have passed against any page at all. The ordering is its own module now and this exercises the
 * function the page runs.
 */
function stepsSeen(o: { onAPaidPlan: boolean; describingOwn: boolean; billingSettled: boolean; somebodyElseLeads?: boolean }) {
  return stepsThisPersonSees({
    onAPaidPlan: o.onAPaidPlan,
    describingOwnSituation: o.describingOwn,
    billingSettledAndFree: o.billingSettled,
    /* Default false: every case in this file is somebody setting up their own check-in. The
       setter's shorter flow is covered in the-setup-flow-asks-one-thing-at-a-time.spec.ts. */
    somebodyElseLeads: o.somebodyElseLeads ?? false,
  })
}
const after = (steps: number[], from: number) => stepAfter(steps, from)

const ORDINARY = { onAPaidPlan: false, describingOwn: false, billingSettled: true }

describe('the setup flow counts what it shows', () => {
  it('THE COMMON PATH IS FIVE SCREENS, not eight', () => {
    // Free plan, picked a situation card, nothing to pay: who, situation, timeline, people, brief.
    expect(stepsSeen(ORDINARY)).toEqual([1, 2, 6, 7, 8])
    expect(stepsSeen(ORDINARY)).toHaveLength(5)
  })

  it('and the billing screen is skipped only when it has nothing to say', () => {
    expect(stepsSeen(ORDINARY)).not.toContain(STAGE.plan)
    // Not settled - still checking, or actually refusing - and it must be shown.
    expect(stepsSeen({ ...ORDINARY, billingSettled: false })).toContain(STAGE.plan)
  })

  it('nobody is walked past a refusal that had not arrived yet', () => {
    // The dangerous case: skipping the screen while the check is still in flight would let
    // somebody set the whole thing up and be refused at the end.
    const stillChecking = stepsSeen({ ...ORDINARY, billingSettled: false })
    expect(after(stillChecking, STAGE.situation)).toBe(STAGE.plan)
  })

  it('forward never lands on a step this person is not shown', () => {
    const steps = stepsSeen(ORDINARY)
    expect(after(steps, STAGE.situation)).toBe(STAGE.timeline)
    expect(after(steps, STAGE.timeline)).toBe(STAGE.people)
    expect(after(steps, STAGE.people)).toBe(STAGE.brief)
  })

  it('and back is exactly forward reversed, which is what it was not before', () => {
    for (const o of [
      ORDINARY,
      { onAPaidPlan: true, describingOwn: false, billingSettled: true },
      { onAPaidPlan: false, describingOwn: true, billingSettled: true },
      { onAPaidPlan: true, describingOwn: true, billingSettled: false },
    ]) {
      const steps = stepsSeen(o)
      for (let i = 0; i < steps.length - 1; i++) {
        expect(after(steps, steps[i])).toBe(steps[i + 1])
        expect(steps[steps.indexOf(steps[i + 1]) - 1]).toBe(steps[i])
      }
    }
  })

  it('every path still ends at the brief, which is what creates the check-in', () => {
    for (const o of [
      ORDINARY,
      { onAPaidPlan: true, describingOwn: true, billingSettled: false },
      { onAPaidPlan: false, describingOwn: true, billingSettled: true },
    ]) {
      const steps = stepsSeen(o)
      expect(steps[steps.length - 1]).toBe(STAGE.brief)
      expect(after(steps, STAGE.brief)).toBe(STAGE.brief) // no next; the brief submits
    }
  })

  it('the longest anybody sees is seven, and only when everything applies', () => {
    expect(stepsSeen({ onAPaidPlan: true, describingOwn: true, billingSettled: false })).toHaveLength(8)
    expect(stepsSeen({ onAPaidPlan: true, describingOwn: true, billingSettled: true })).toHaveLength(7)
  })
})
