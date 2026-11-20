/**
 * A RECORD CAN BE THIN FOR EVERYBODY, AND THE CHECK COULD NOT SEE IT.
 *
 * `thinNotice` compares each party against the biggest contributor: under 15% of the most talkative
 * person and you are flagged. That catches the case it was written for — one person wrote three
 * pages and the other wrote a line — and it is blind to the case that turns out to be far more
 * common. Two people who each say a hundred and seventy characters are both at 100% of the maximum,
 * so nothing is flagged, and the model is handed almost nothing with no indication that it is
 * almost nothing.
 *
 * Measured on the hundred-journey corpus: 58 of 59 thin reports followed a thin check-in rather
 * than a rich one. The synthesis was doing its job on the material it had.
 *
 * So there is an absolute floor as well as a relative one. It is deliberately low: this is not a
 * gate on finishing — the completion rules own that, and raising them makes people abandon — it is
 * a note telling the model what it is working with, so it writes about a sentence as a sentence
 * rather than as a position.
 */

/** Below this, from one party in a completed round, is thin in absolute terms rather than relative. */
export const A_PARTY_SAID_LITTLE_UNDER_CHARS = 400;

export interface WhatAPartySaid {
  label: string;
  charCount: number;
}

/**
 * The note for the corpus, or '' where there is nothing to say.
 *
 * @param relativeNotice the existing relative notice, so the two cannot contradict each other in
 *   the same prompt: where somebody is already flagged for being quiet next to a talkative
 *   colleague, saying it twice in different words invites the model to weigh it twice.
 */
export function everybodySaidLittle(parties: readonly WhatAPartySaid[], relativeNotice: string): string {
  if (!parties.length) return '';
  const contributing = parties.filter((p) => p.charCount > 0);
  if (!contributing.length) return '';

  const allThin = contributing.every((p) => p.charCount < A_PARTY_SAID_LITTLE_UNDER_CHARS);
  if (!allThin) return '';
  /* The relative notice already says somebody is short. Adding this one there would be two
     instructions about the same fact. */
  if (relativeNotice) return '';

  const most = Math.max(...contributing.map((p) => p.charCount));
  return (
    `NOTE [the whole record is thin]: every party's account in this round is short - the longest is ` +
    `about ${most} characters. This is a few sentences in total, not a conversation. Write what was ` +
    `actually said and no more: do not describe a sentence as a position, do not infer a stance ` +
    `nobody stated, and where there is not enough to compare, say that rather than composing a ` +
    `difference out of two short answers. A further check-in is what this needs.\n\n`
  );
}
