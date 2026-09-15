/**
 * "AND CONFIRM THE NEW NUMBERS WITH AMIR."
 *
 * Off a live second check-in. She said "I will speak to Rita on Thursday and confirm the new numbers
 * with Amir", and the extractor did the right thing by making two commitments of it, because they
 * are two. It kept the conjunction on the front of the second one, so the lead's report carried a
 * line starting "and", under a heading, with nothing in front of it.
 *
 * Splitting a sentence in two is the extractor's job and this does not touch it. What this does is
 * take the join off the front of the half that got it: a word whose only job was to attach this
 * clause to the one before it, in a place where the one before it is not.
 *
 * NOT A REWRITE. Her words are the point of a record entry and every other word of them stays
 * exactly as she said it. Only a leading conjunction goes, and only when the rest is still a
 * sentence worth reading on its own.
 */

/** The joins that get left behind. Not "if"/"when"/"because": those open a clause that means something. */
const A_JOIN_LEFT_BEHIND = /^(?:and|but|so|then|also|plus|or)\b[\s,]*/i;

/** Short enough to be the join and nothing else, which is not an entry at all. */
const THERE_IS_NOTHING_LEFT = 3;

export function theLineWithoutItsDanglingJoin(text: string): string {
  const trimmed = (text ?? '').trim();
  const m = A_JOIN_LEFT_BEHIND.exec(trimmed);
  if (!m) return trimmed;

  const rest = trimmed.slice(m[0].length).trim();
  /* "And." or "So," on its own: leave it exactly as it came rather than store an empty entry. */
  if (rest.length < THERE_IS_NOTHING_LEFT) return trimmed;

  /* A sentence starts with a capital. Only the first letter is touched, so "iPhone" stays put. */
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}
