import { isADeadEnd } from './a-reply-that-asks-nothing-is-a-dead-end';

/**
 * NOBODY IS LEFT LOOKING AT A PARAGRAPH WITH NO QUESTION IN IT.
 *
 * Two places knew a reply could ask nothing and neither one fixed it.
 *
 * The opener already retried once and then shipped the first attempt anyway - "the second opener
 * did not clear it either; the first stands" - so the first thing this product ever says to
 * somebody could be a paragraph and a text box. Hafsah, 23 September 2026, on the open link: "I
 * also dont see a question on the screen shot."
 *
 * And in an ordinary turn it was only LOGGED. The comment said as much: a reply with no question
 * really does strand somebody, so if the log says it happens it should come back as a retry. The
 * log says it happens - caught on a live open-link conversation the same day, five answers in, on
 * the turn after somebody described how they vet their suppliers.
 *
 * WHY A FIXED SENTENCE RATHER THAN A THIRD MODEL CALL. The model has already been asked twice and
 * has twice not asked anything. A third attempt costs another wait from a person who is looking at
 * a dead end right now, and might fail the same way. One plain question, added to what the model
 * did write, always makes sense and cannot invent a fact - which is the only bar that matters for
 * something the product says in its own voice.
 *
 * NOT USED WHEN THE TURN IS CLOSING. A closing reply is meant to ask nothing; adding a question to
 * it would reopen a conversation the person has just finished.
 */

/** The last resort for an opening turn. It works whatever the check-in is about. */
export const A_PLACE_TO_START = 'Where would you like to start?';

/** And for a turn in the middle of one, where there is already something to build on. */
export const WHAT_ELSE = 'What else should I know?';

/**
 * The text, with a question on the end where it had none.
 *
 * `closing` is passed straight through to `isADeadEnd`, which is the one place that decides what
 * counts as asking nothing, so this can never disagree with the guard that found the problem.
 */
export function withAQuestion(
  text: string | null | undefined,
  { opening = false, closing = false }: { opening?: boolean; closing?: boolean } = {},
): string {
  const said = (text ?? '').trim();
  if (!said) return opening ? A_PLACE_TO_START : WHAT_ELSE;
  if (closing) return said;
  if (!isADeadEnd(said, closing)) return said;
  return `${said}\n\n${opening ? A_PLACE_TO_START : WHAT_ELSE}`;
}
