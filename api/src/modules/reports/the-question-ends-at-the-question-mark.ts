/**
 * ONE QUESTION, AND IT ENDS WHERE THE QUESTION ENDS.
 *
 * Every report carries one question. Read off a run of all 23 situations, three of them carried
 * this after it:
 *
 *   "...what is the shared definition of a contribution worth recording? Answering this will frame
 *    the choice now in front of you: grant the ask for a documented record, decline it, or set a
 *    clear milestone for 'not yet'."
 *
 *   "...what would need to be true for each of you to be clear on your part? With a shared picture
 *    now emerging, the choice is whether it is clear enough to name the situation, or if more
 *    accounts are needed to proceed."
 *
 * That is the model narrating what answering the question will do for us, in our own vocabulary -
 * our closing options and our internal states - printed to somebody who came to read about their
 * team. It is the same class of leak as `[VERIFIABILITY:HIGH]` appearing under people's names.
 *
 * WHY THE QUESTION MARK AND NOT A LIST OF OUR WORDS. Matching our vocabulary means keeping a list
 * of it, and the list is only ever as good as the leaks somebody has already seen. A question ends
 * at its question mark; everything after it is the model explaining itself. One rule, and it holds
 * for the next leak too, in words nobody has written down yet.
 *
 * WHAT IT DOES NOT DO. It does not make the question less than a question, shorten it, or touch a
 * word of it. A compound question - "What is X, and what is Y?" - has one question mark and comes
 * through whole; that is the prompt's job, not this one's. And a value carrying no question mark at
 * all is returned untouched rather than emptied: it is still the model's answer, and a reader is
 * better served by an odd sentence than by a blank panel.
 */
export function theQuestionOnly(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text) return null;
  const ends = text.indexOf('?');
  if (ends === -1) return text;
  return text.slice(0, ends + 1).trim();
}
