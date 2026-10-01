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

/** The sentence with its pronoun replaced by "A colleague's" or by `name` followed by 's. */
export function whoseIsIt(what: string, name: string | null = null): string {
  const t = what.trim();
  if (!A_POSSESSIVE.test(t)) return what;
  const whose = name ? `${name}'s` : `A colleague's`;
  return t.replace(A_POSSESSIVE, whose);
}
