/**
 * A ROOM OF PEOPLE IS NOT ONE PERSON.
 *
 * The open link is a QR code on a screen at an event. A hundred people scan it in the same minute,
 * from the same wifi, and so from ONE address - and every one of these routes was throttled per
 * address at ten a minute. So the eleventh person to scan it was turned away, and the hundredth
 * never got in at all.
 *
 * Proven on 23 September 2026 driving a hundred respondents at the real endpoints: ten at a time
 * deadlocked on 429s and the run had to be slowed to four before it would move.
 *
 * TWO DIFFERENT THINGS WERE BEING COUNTED AS ONE. Answering and finishing both carry the
 * respondent's own secret - the key minted when they started - so those can be counted PER PERSON,
 * which is what the limit was always for: one person cannot flood, and a hundred people in a room
 * do not collide with each other. Only starting has no key yet, and that stays keyed by address
 * with a ceiling sized for a room rather than for one clicker.
 *
 * WHAT IS STILL BOUNDED. Starting is the only route a stranger can reach without already holding a
 * key, and it is the expensive one - a row, a check-in and the opening model call. A room is a
 * hundred and twenty a minute; a script is still stopped.
 */

/** A room arriving at once, and still a ceiling. Keyed by address, because nobody has a key yet. */
export const A_ROOM_MAY_START_PER_MINUTE = 120;

/** One person answering. Generous for somebody typing, absurd for a loop. */
export const A_PERSON_MAY_SAY_PER_MINUTE = 30;

/**
 * The respondent's own secret, where the request carries one.
 *
 * Read from the body rather than a header because that is where the open link's own routes put it,
 * and it is not a claim about identity that buys anything: holding the key IS being that
 * respondent. A forged key buys a bucket of its own, which is the same bucket a real one gets.
 */
export function whoseAnswerThisIs(req: Record<string, any>): string | null {
  const key = req?.body?.key;
  if (typeof key !== 'string') return null;
  const trimmed = key.trim();
  /* The keys this product mints are 48 hex characters. Anything shorter is not one, and letting a
     one-character "key" through would hand every caller the same bucket. */
  if (!/^[a-f0-9]{24,64}$/i.test(trimmed)) return null;
  return trimmed;
}
