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
  /**
   * WHAT IT ASKS FOR, AND WHY IT IS A QUESTION.
   *
   * "Describe your own situation" / "Tell it in your own words" said what the person had to DO and
   * nothing about what the answer was for, so it read as a box to fill in before the real thing
   * started. It is not: what somebody writes here becomes the purpose every conversation in this
   * check-in is held against.
   *
   * Both doors asked for it in their own words - the entry chat with one pair of sentences and the
   * setup textarea with another - which is the same drift that has turned up in the card names, the
   * groups, the tags and the durations this week. One pair, read by both.
   */
  describeOwnQuestion: string;
  describeOwnHelp: string;
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
    /*
     * NAMED FOR THE JOB, LIKE EVERY OTHER CARD NOW. "Describe your own situation" told somebody
     * what they would have to DO to use it; the rest of the picker tells them what they get. It is
     * still the escape hatch and still the first pick, which is why it is counted out of
     * HOW_MANY_NAMED_SITUATIONS - calling it a situation would be counting the escape hatch as an
     * option.
     */
    describeOwnLabel: 'Work Through Something Else',
    describeOwnQuestion: 'What are you trying to achieve with this check-in?',
    /*
     * AND ONE WORKED EXAMPLE. The help text said what to put in and gave no sense of how much, how
     * specific, or whether a number belongs - which is the whole difficulty of an empty box. The
     * example is deliberately not about software: this gets used to buy chickens and sell tea.
     */
    describeOwnHelp:
      'Set the overall context, goals, or plan, or add them for each individual, in your own words. '
      + 'This will define the purpose of the conversations in each check-in.',
  };
}
