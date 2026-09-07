/**
 * WHICH SETUP STEPS THIS PERSON WILL ACTUALLY BE SHOWN, IN ORDER.
 *
 * Three of the eight stages are conditional - the coach (paid plans only), the free-text
 * description (that path only), and the billing screen. Every part of the flow used to work the
 * skipping out for itself: `next` had its own arithmetic, `back` had a special case with a comment
 * apologising for it, and the counter read `Object.keys(STAGE).length`. Skipping a step in three
 * places and counting it in a fourth is how somebody on the ordinary path was told "Step 5 of 8"
 * directly after step 3, and how Back could land on a screen they were never shown.
 *
 * A MODULE RATHER THAN A HELPER INSIDE THE PAGE, because the page is a 1,900-line component and a
 * test of it would have to be a test of the source text. This is the ordering on its own, so the
 * guard exercises the thing the page runs instead of a copy of it.
 */
export const STAGE = {
  who: 1,
  situation: 2,
  coach: 3,
  describe: 4,
  plan: 5,
  timeline: 6,
  people: 7,
  brief: 8,
} as const

export interface WhoIsSettingUp {
  /** The coach step is offered on paid plans. */
  onAPaidPlan: boolean
  /** They chose to write the situation themselves rather than pick a card. */
  describingOwnSituation: boolean
  /**
   * The billing check has come back AND come back allowing this check-in.
   *
   * THE BILLING STEP EARNS ITS PLACE OR IT IS NOT THERE. It has two states: "no payment needed,
   * press Continue", and a real refusal with an access-code box. The first is a screen whose only
   * content is that it has nothing to say, shown in the middle of setting something up.
   *
   * False while the check is still in flight, deliberately: a person must never be walked past a
   * refusal that had not arrived yet and be stopped at the end instead.
   */
  billingSettledAndFree: boolean
}

export function stepsThisPersonSees(who: WhoIsSettingUp): number[] {
  return [
    STAGE.who,
    STAGE.situation,
    ...(who.onAPaidPlan ? [STAGE.coach] : []),
    ...(who.describingOwnSituation ? [STAGE.describe] : []),
    ...(who.billingSettledAndFree ? [] : [STAGE.plan]),
    STAGE.timeline,
    STAGE.people,
    /*
     * THE BRIEF IS BACK FOR EVERYBODY, because the person it was skipped for no longer exists.
     * It came out for "Someone else sets the context" - asking a setter to write a brief about a
     * situation they had just said was not theirs. That answer is gone, so everybody on this step
     * is writing their own context and the brief is theirs to write.
     */
    STAGE.brief,
  ]
}

/** Where this person goes from `from`. The last step has no next; the brief submits instead. */
export function stepAfter(steps: number[], from: number): number {
  const i = steps.indexOf(from)
  return i === -1 || i === steps.length - 1 ? from : steps[i + 1]
}

/** Where Back goes, or null when there is nowhere left and the caller should leave the flow. */
export function stepBefore(steps: number[], from: number): number | null {
  const i = steps.indexOf(from)
  return i > 0 ? steps[i - 1] : null
}
