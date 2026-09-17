/**
 * "IT DOESN'T GIVE EXAMPLES OF THE RESPONSES IT EXPECTS."
 *
 * Read off a live check-in on 15 September 2026:
 *
 *   "When you say 10,000 units are sold, what would tell you, or anyone else looking, that this
 *    goal has been met?"
 *
 * A fair question, and a hard one cold. It asks somebody to invent a SHAPE - what kind of thing
 * counts as evidence - with nothing to show what that shape is. People stall, or answer in the
 * abstract, and the record gets worse.
 *
 * The prompt has asked for examples on exactly these questions for months: "where a question is
 * hard to answer cold, show what an answer looks like... two short examples, at most, after the
 * question". It is one paragraph in eighteen thousand words and it loses, the same way the rule
 * against restating lost 58 times out of 75 until it was checked in code.
 *
 * WHAT THIS DOES NOT DO. It does not supply the examples - they have to be built from what this
 * person has already said, their nouns and their numbers, and that is judgement the model is good
 * at and a regex is not. It spots the shape-question that arrived bare and asks once more.
 *
 * NOT EVERY QUESTION. "How is it going" needs no example and would be patronised by one. Only the
 * ones that ask somebody to invent a form of words they have never had to produce before.
 */

/** Questions that ask for a shape rather than a fact. */
const ASKS_SOMEBODY_TO_INVENT_A_SHAPE = [
  /what would tell (?:you|us|anyone)/i,
  /how would (?:you|we|anyone) know/i,
  /what would (?:exist|be true|success look like)/i,
  /what does (?:good|success|done) look like/i,
  /what would (?:it|that) take for/i,
  /what evidence/i,
  /what would count as/i,
  /how will (?:you|we) (?:measure|check|tell)/i,
  /what would make (?:it|this|that) (?:checkable|verifiable)/i,
];

/**
 * An example, however it is introduced. The prompt asks for "for instance" or "something like"
 * rather than a bulleted menu, so this looks for the openers a sentence uses and not for a list.
 */
const SHOWS_ONE = [
  /for instance/i,
  /something like/i,
  /for example/i,
  /e\.g\./i,
  /such as/i,
  /even a\b/i,
  /even just/i,
  /say,? a\b/i,
  /- a signed|a signed \w+,|a number in|a line in/i,
];

export function asksForAShapeWithoutShowingOne(reply: string): boolean {
  const text = (reply ?? '').trim();
  if (!text) return false;
  if (!ASKS_SOMEBODY_TO_INVENT_A_SHAPE.some((rx) => rx.test(text))) return false;
  return !SHOWS_ONE.some((rx) => rx.test(text));
}

export const SHOW_WHAT_ONE_LOOKS_LIKE = `You have just asked somebody to invent a shape - what would count, what would tell you, what good looks like - and given them nothing to show what that kind of answer looks like. Cold, that question is hard, and people either stall or answer in the abstract.

Ask it again with one or two short examples after it. Not before it, and never as a list to pick from: "for instance" or "something like", inside the sentence.

BUILD THEM FROM WHAT THEY HAVE ALREADY TOLD YOU. Their own nouns, their own numbers, their own situation. Somebody who has just talked about units of tea in Abuja gets an example about units of tea in Abuja - money in the account, a signed order, a delivery note - and never an example about hiring or probation. An example from somebody else's situation tells them you were not listening.

Keep the question itself. Two examples at most, one line each.`;
