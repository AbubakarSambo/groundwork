/**
 * THE WORDS ON THE SITUATION STEP, AND WHY THEY NO LONGER BRANCH.
 *
 * This file existed because step 1 had a third answer - "Someone else sets the context": you create
 * the check-in, somebody else writes what it is about, checks in, and sees the results. On that
 * path the next screen was speaking to the wrong person ("the question YOU are actually asking",
 * "Describe YOUR OWN situation") about a situation that was not theirs, so the wording forked.
 *
 * That answer is gone, on her call: "I think we should remove the whole org admin setting a context
 * and handing it over to a lead. It seems like it is confusing." Everybody who reaches this step
 * now writes the context themselves - the only remaining question is whether they also check in
 * against it, which does not change a word here. So there is one wording, and it is the second
 * person, which is true again.
 *
 * KEPT AS A MODULE RATHER THAN INLINED, and that is deliberate rather than leftover. These two
 * strings are asserted from two other files - the situation count in the intro is checked against
 * the catalogue by a-number-in-copy-drifts.spec.ts - and moving them into the JSX puts them back
 * inside a 2,000-line component where the last drift went unnoticed.
 */

import { OR_CHOOSE_A_SITUATION } from '@/lib/one-way-to-say-what-a-situation-does';

export type TheWordsForPickingASituation = {
  /** The sentence under "Step 2 . The situation". */
  intro: string;
  /** The one card that is not a named situation. */
  describeOwnLabel: string;
};

export function theWordsForPickingASituation(): TheWordsForPickingASituation {
  return {
    /* The invitation is the entry chat's, to the word - see the module it comes from. "Pick the
       closest fit" asked somebody to classify themselves and left them guessing what picking one
       would do; this says what it does.
       The cadence clause stays and stays here: this is the screen showing all 22, and how often
       people are asked is the thing that most separates one from another. The entry chat, which
       shows none of them, does not need it. */
    intro:
      `situations, grouped by the question you are actually asking. Every one of them is an objective agreed at the start, then a run of check-ins testing the work against it. Describe your own, or ${OR_CHOOSE_A_SITUATION}: it sets the questions people are asked and how often.`,
    describeOwnLabel: 'Describe your own situation',
  };
}
