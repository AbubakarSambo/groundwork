/**
 * "NOT YOUR SITUATION, THE SITUATION."
 *
 * Step 1 of the set-up wizard has three answers, and one of them is "Someone else sets the
 * context": you are creating the check-in and inviting somebody to lead it, they write what it is
 * about, they check in, they see the results. Nothing on the next step knew that. It kept speaking
 * to whoever was clicking as though the situation were theirs:
 *
 *   "22 situations, grouped by the question YOU are actually asking"
 *   "YOU cannot name it, so nothing below should be guessed on YOUR behalf"
 *   "Describe YOUR OWN situation"
 *
 * On that path all three are false. The question is not yours, it is not your behalf the guessing
 * would be on, and the situation is not your own. Reported from the screen, not from a test: the
 * next step reads as confusing because the person it addresses is not the person using it.
 *
 * Why this is not fixed in the catalogue: `SCENARIO_LABELS.OPEN_READ` and the group questions are
 * shared with the entry chat, where the person describing the situation IS the person whose
 * situation it is, and "your own" is exactly right there. One string cannot be true for both
 * readers, so the branch belongs to the surface that knows which reader it has.
 *
 * What deliberately does NOT change on either path: the situation names and what each one runs
 * like. Those are facts about the product, not about who is looking.
 */

export type TheWordsForPickingASituation = {
  /** The sentence under "Step 2 · The situation". */
  intro: string;
  /** The blurb under the "Not sure yet" group heading. */
  openGroupQuestion: string;
  /** The one card that is not a named situation. */
  describeOwnLabel: string;
};

/**
 * @param somebodyElseLeads the "Someone else sets the context" answer from step 1
 * @param theirName optional, and only used when we have it - "Ada writes what it is about" beats
 *                  "they write what it is about", and neither is worth an empty space
 */
export function theWordsForPickingASituation(
  somebodyElseLeads: boolean,
  theirName?: string | null,
): TheWordsForPickingASituation {
  if (!somebodyElseLeads) {
    /* The person clicking is a party to this, so the second person is honest. Unchanged wording. */
    return {
      intro:
        'situations, grouped by the question you are actually asking. Every one of them is an objective agreed at the start, then a run of check-ins testing the work against it. Pick the closest fit: it sets the questions people are asked and how often.',
      openGroupQuestion: 'You cannot name it, so nothing below should be guessed on your behalf.',
      describeOwnLabel: 'Describe your own situation',
    };
  }

  const them = theirName?.trim() ? theirName.trim() : 'They';
  const themLower = theirName?.trim() ? theirName.trim() : 'they';
  return {
    intro:
      `situations, grouped by the question being asked. Every one of them is an objective agreed at the start, then a run of check-ins testing the work against it. Pick the closest fit to the situation ${themLower} ${
        theirName?.trim() ? 'is' : 'are'
      } in: it sets the questions people are asked and how often. ${them} still ${
        theirName?.trim() ? 'writes' : 'write'
      } what it is about.`,
    /* Not "on your behalf" - the guessing would be on theirs. */
    openGroupQuestion: `You cannot name it for ${
      theirName?.trim() ? theirName.trim() : 'them'
    }, so nothing below should be guessed on their behalf.`,
    describeOwnLabel: 'Describe the situation',
  };
}
