/**
 * "HER LOGIN FOR THE ORDER SYSTEM IS HOLDING IT UP." NAMES NOBODY (request 97d).
 *
 * What is waited on is stored as the person said it, and a person says "her login for the order
 * system" about somebody they were just talking about. Taken out of that conversation and put on a
 * list as one line, "Her" has nobody to be. Where the thing waited on starts with his, her or their,
 * it is said as "A colleague's login for the order system" for everybody, which is true and names no
 * one. Where the reader may name people (they run the check-in, or people are named to each other
 * on it) and the row says who the thing is waited on from, the name goes in instead: "Neema's login".
 *
 * The person is the one the row says is waited on (`onParticipantId`). Nothing guesses at a person
 * from the pronoun, and a thing waited on from somebody outside the check-in is "A colleague's".
 */
const A_POSSESSIVE = /^(?:her|his|their)\b/i;

export function startsWithAPronoun(what: string | null | undefined): boolean {
  return !!what && A_POSSESSIVE.test(what.trim());
}

/**
 * "THEIR" IS NOT ALWAYS A COLLEAGUE (run-25, sales). Femi waited on the customers for "their documents, especially
 * the bank statements": the customers' documents. Every reader of the board read "Work is held up by a colleague's
 * documents, especially the bank statements." The owner was invented. "Their" is very often several people, or
 * whoever the wait is on, so it becomes a colleague's only where the row says a person in the check-in is waited
 * on (`onParticipantId`), and otherwise it is said as whoever the row says it waits on ("the customers'
 * documents"), or left as the person said it. "Her" and "his" are one person, and stay as before.
 */
const THEIR = /^their\b/i;

/** Whoever a wait is on, as the row stores it: a person in the check-in, or a name for somebody outside it. */
export interface WhoItWaitsOn {
  onParticipantId?: string | null;
  onLabel?: string | null;
}

/** "the customers" -> "the customers'", "the supplier" -> "the supplier's". */
const possessive = (label: string): string => (/s$/i.test(label) ? `${label}'` : `${label}'s`);

/** The sentence with its pronoun replaced by "A colleague's", by `name` followed by 's, or for "their", by whoever it waits on. */
export function whoseIsIt(what: string, name: string | null = null, on?: WhoItWaitsOn): string {
  const t = what.trim();
  if (!A_POSSESSIVE.test(t)) return what;
  if (THEIR.test(t) && !name && on !== undefined && !on.onParticipantId) {
    const label = (on.onLabel ?? '').trim();
    if (!label) return what;
    /* Read inside a sentence, as the pronoun was: "The customers" is "the customers" there, unless the line began with it. */
    const inPlace = /^T/.test(t) ? label.charAt(0).toUpperCase() + label.slice(1) : label.replace(/^The\b/, 'the');
    return t.replace(THEIR, possessive(inPlace));
  }
  const whose = name ? `${name}'s` : `A colleague's`;
  return t.replace(A_POSSESSIVE, whose);
}
