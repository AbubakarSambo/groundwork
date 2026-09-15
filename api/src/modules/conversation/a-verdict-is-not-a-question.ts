/**
 * "THAT STOPS BEING A COMMUNICATION PROBLEM SOMEWHERE AROUND THE SECOND TIME."
 *
 * Read off a real participant check-in. Rita said the leads coming through were not qualified, and
 * that she had raised it with Marketing twice and nothing changed. The reply told her what that
 * meant:
 *
 *   "That's not just a problem with the leads; it is a problem that wastes your time."
 *   "You've raised this with Marketing twice, and nothing has changed. That stops being a
 *    communication problem somewhere around the second time."
 *
 * Nobody in Marketing is in that conversation. They cannot answer, they will read the board this
 * feeds, and the product has just agreed with one side about them in its own voice. The prompt
 * already carries the rule - a claim about a colleague is theirs, not yours, three and a half
 * thousand characters of it - and the rule did not hold.
 *
 * THE FAULT IS NOT SYMPATHY. Reflecting what somebody said, and saying it plainly, is the job:
 * "you have raised it twice and nothing changed" is hers and repeating it is fine. What crosses the
 * line is the sentence after it, where the product decides what kind of problem it is. She described
 * a situation; it returned a finding.
 *
 * WHAT IS CHECKABLE. Not whether a sentence is fair, which needs judgement. Whether it RE-LABELS what
 * they said - "that is not just X, it is Y", "that stops being X", "which suggests Y" - in a turn
 * where they have been talking about somebody who is not here. Both halves are needed: re-labelling
 * their own work is usually fine, and mentioning a colleague plainly is fine.
 */

/** The shapes a verdict comes in when it is pretending to be a summary. */
const RE_LABELS_WHAT_THEY_SAID = [
  /\bthat(?:'s| is| was)? ?n[o']?t just\b/i,
  /\bthat stops being\b/i,
  /\bthat(?:'s| is) no longer\b/i,
  /\bwhich suggests\b/i,
  /\bthat (?:means|tells us|says) (?:there|this|that|it)\b/i,
  /\bthe real (?:problem|issue|question) (?:here )?is\b/i,
  /\bwhat (?:this|that) really is\b/i,
  /\bat (?:that|this) point (?:it|this|that) (?:is|becomes)\b/i,
  /*
   * "THAT IS THE KIND OF THING THAT SHOWS UP AS A SALES PROBLEM WHEN IT'S A SYSTEMS ONE."
   *
   * Read off a session-two reply and it went straight past the list above. She said the aggregation
   * point was slowing things down; the product told her what sort of problem that really is. Same
   * move as the ones already here and not one of the phrasings they cover.
   *
   * These three are the shapes that slipped: naming a category of thing, reading one thing as
   * another, and telling somebody what their situation actually is.
   */
  /\b(?:that|this|it)(?:'s| is) the kind of (?:thing|problem|issue)\b/i,
  /\bshows up as (?:a|an) [a-z ]{3,24} (?:problem|issue|thing)\b/i,
  /\b(?:what|that) (?:you(?:'re| are) )?(?:actually|really) (?:have|describing|dealing with) (?:is|here is)\b/i,
];

/**
 * Somebody they mentioned who is not in this conversation.
 *
 * A department reads as a person here on purpose: "Marketing has not fixed it" lands on the people in
 * Marketing exactly as a name would, and they are no more able to answer it.
 */
export function aThirdPartyIsInPlay(theySaid: string, reply: string): boolean {
  const said = `${theySaid ?? ''} ${reply ?? ''}`;
  const TEAMS = /\b(?:marketing|sales|finance|product|engineering|legal|hr|ops|operations|support|leadership|the board|procurement|compliance)\b/i;
  /*
   * A capitalised name followed by something a person does. The first version read "That is not just
   * a scheduling thing" as a person called That, because a sentence begins with a capital and "is" is
   * on the verb list. So the words a sentence actually starts with are excluded by name.
   */
  const NOT_A_PERSON = new Set([
    'that', 'this', 'it', 'they', 'we', 'you', 'she', 'he', 'there', 'what', 'who', 'when', 'the',
    'and', 'but', 'so', 'if', 'nothing', 'nobody', 'everything', 'everybody', 'something', 'someone',
    'my', 'our', 'their', 'his', 'her', 'none', 'half', 'most', 'some', 'all', 'one', 'two', 'three',
  ]);
  const DOES_SOMETHING = /\s(?:said|says|has|have|is|was|will|needs?|owns?|keeps?|told|sent|promised)\b/;
  const looksLikeAPerson = [...said.matchAll(/(?:^|[.!?]\s|,\s|\s)([A-Z][a-z]{2,})(?=\s)/g)].some((m) => {
    if (NOT_A_PERSON.has(m[1].toLowerCase())) return false;
    return DOES_SOMETHING.test(said.slice(m.index! + m[0].length - 1));
  });
  return TEAMS.test(said) || looksLikeAPerson;
}

/**
 * Does this reply hand back a verdict rather than a question?
 *
 * Questions are exempt outright. "Does that stop being a communication problem at some point?" is the
 * same idea offered back for them to accept or refuse, which is the whole difference.
 */
export function isAVerdictAboutSomebodyElse(theySaid: string, reply: string): boolean {
  if (!aThirdPartyIsInPlay(theySaid, reply)) return false;
  return (reply ?? '')
    .split(/(?<=[.?!])\s/)
    .filter((s) => s.trim() && !/\?\s*$/.test(s.trim()))
    .some((s) => RE_LABELS_WHAT_THEY_SAID.some((p) => p.test(s)));
}

export const HERS_TO_DRAW = `One of your sentences decides what kind of problem this is, about somebody who is not in this conversation and cannot answer.

Take it out. Say what they said, in their words, and ask your question. If the conclusion is worth reaching, they are the one to reach it: put it to them as a question and let them accept or refuse it.

Everything else in the reply stays as you wrote it.`;
