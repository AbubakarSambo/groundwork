/**
 * WHAT A LEAD IS ACTUALLY BEING ASKED TO DO, in one page an admin can send.
 *
 * An admin putting 160 people on cannot train them one conversation at a time, and the only
 * material this product had was four tabs behind a question mark in the corner of a screen those
 * people have not signed in to yet.
 *
 * SO THE STEPS LIVE HERE and both surfaces read them. The modal taught this well; what it could
 * not do was be sent to somebody. Copying the four steps into a second page would have them
 * disagreeing within a month, and the version being disagreed about is the one an admin used to
 * brief their company.
 */
export const HOW_TO_STEPS = [
  {
    title: 'Open a check-in before the situation becomes urgent',
    body: 'It works best when you open it early, for example when someone new is starting, a project is beginning, or two founders are agreeing how they will work together. The record you build before the conversation is the one you can stand on.',
  },
  {
    /*
     * THIS STEP DESCRIBED A SCREEN THAT NO LONGER EXISTS.
     *
     * It said "Set a resolution state before the check-in starts - before the first check-in,
     * everybody agrees on what a successful outcome looks like", and asked. Nothing in the product
     * does that. `resolutionState` is still on the ground and its schema comment still calls it a
     * "pre-agreed intended outcome set at creation", but the set-up step that offered the end
     * states is gone - the stale numbering comment in CreateGroundPage still listed it as step 4 -
     * and `END_STATES` is now imported by nothing except the spec that mirrors it. End states are
     * chosen at the CLOSE, on the report.
     *
     * What actually happens is better than what it claimed, and it happens per person: the brief
     * asks what needs to be true at the end, and the check-in asks each person "what does success
     * look like from where you sit - your version of what good looks like here, not the job
     * description". The gap between those answers is most of what the report is for.
     *
     * The three-word list that followed - "Alignment confirmed. Promotion recommended. Brief
     * revised." - is out on her instruction, and it was doing nothing: three outcomes from three
     * different scenarios, offered to somebody who has not been told what a scenario is.
     */
    title: 'Say what you want to be true at the end',
    body: 'The brief asks what this is about, and what has to be true when it is finished. Each person then gives their own version of what good looks like. Most of what the report is for is where those answers differ, so be plain about yours.',
  },
  {
    title: 'Check in on your own, and be specific',
    body: 'Each person checks in separately, and Groundwork asks follow-up questions to get a specific answer. A vague answer makes a weak record, so the more specific you are, the more useful the report will be.',
  },
  {
    title: 'Use the report as the basis for the conversation, not the conversation itself',
    body: 'The report puts what everybody said in one place, and everybody in it reads the same one. The gap is what needs talking about. Groundwork never decides; you decide, with something real in front of you.',
  },
]
