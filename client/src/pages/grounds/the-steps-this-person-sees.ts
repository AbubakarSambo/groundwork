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
/*
 * THE NUMBERS ARE IDENTITIES, NOT AN ORDER. The order is `stepsThisPersonSees` below, and it has
 * been since a flow that skipped steps in three places and counted them in a fourth told somebody
 * "Step 5 of 8" directly after step 3.
 *
 * `who` moved from first to last and kept a number, which is why it reads oddly here. It was the
 * opening screen: who writes the objective, and who checks in against it. Her call moved it to the
 * end - "you either set the context to checkin or set it and other checkin, you just look at the
 * reports" - and the reason it had to move is what watching the entry chat showed: whatever
 * situation somebody picked, the first thing the product did was ask a question about org structure
 * that would have fitted any situation on the list. The first screen belongs to their situation.
 */
export const STAGE = {
  situation: 1,
  coach: 2,
  describe: 3,
  plan: 4,
  timeline: 5,
  people: 6,
  brief: 7,
  who: 8,
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

/**
 * THE FLOW IS THE PICKER AND THEN A CONVERSATION.
 *
 * Her words, over the screen showing "Step 5 of 5 - The brief": "this page should not really exist
 * based on the conversation we have been having. the entry chat and the wizard should be similar,
 * right?" - and before that, repeatedly: "the entry chat flow is better and having a report at the
 * end is nice", "the in platform still has multiple steps".
 *
 * She is right, and the reason is not that forms are unfashionable. The six screens after the picker
 * asked for exactly what the setup conversation already asks for and extracts - what this is about,
 * who is in it, why now, how long, how often, the brief - and asked for them worse: a textarea
 * cannot say "you have said what, but not who", cannot press on a vague answer, and cannot tell a
 * new hire's setup from a contract renewal's. Then it ended on an admin board rather than on the
 * person's own check-in and a report, so most people who set one up never gave an account at all.
 *
 * WHAT IS LEFT HERE: the picker, and the billing screen when it is actually blocking. Everything
 * else moved to the conversation at /start, which the picker now hands to with the situation already
 * chosen. The other stages stay in the enum because grounds created before this still reference them
 * and because the billing check reads STAGE.plan.
 */
export function stepsThisPersonSees(who: WhoIsSettingUp): number[] {
  return [
    STAGE.situation,
    ...(who.onAPaidPlan ? [STAGE.coach] : []),
    ...(who.describingOwnSituation ? [STAGE.describe] : []),
    /* Still in the list, and still only when it is refusing. A person must never be walked past a
       refusal that had not arrived yet, and that is as true of a two-screen flow as an eight. */
    ...(who.billingSettledAndFree ? [] : [STAGE.plan]),
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
