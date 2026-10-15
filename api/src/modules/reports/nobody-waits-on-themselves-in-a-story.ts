/**
 * NOBODY WAITS ON THEMSELVES, IN A STORY ALREADY STORED (request 118, part 5, from request 117, part 6).
 *
 * Before request 111 (e), a lead's own things to do could be stored as a wait on "themselves", and a report's
 * story written then still says it. Once the lead's label became "you", Rukia read, in the story of "Sales team,
 * Q3": "You are waiting on themselves to approve a discount for Baraka Mwangi and to send a price list to Amani
 * Wekesa." The record is right now; this puts the stored sentence right where it is served, before any script
 * has run: "You still have to approve a discount for Baraka Mwangi and to send a price list to Amani Wekesa."
 *
 * Only "waiting on themselves (himself, herself, yourself) to ...", which can only mean the person's own thing to
 * do. A wait on anybody else is left exactly as it is.
 */
const SELF = '(?:themselves|themself|himself|herself|yourself|yourselves)';

export function nobodyWaitsOnThemselvesInAStory(text: string): string {
  if (!text || !new RegExp(`waiting on ${SELF}`, 'i').test(text)) return text;
  return text
    .replace(new RegExp(`\\b(is|are|was|were) (still )?waiting on ${SELF} to\\b`, 'g'), (_m, verb: string) =>
      (verb === 'is' ? 'still has to' : verb === 'are' ? 'still have to' : 'still had to'))
    .replace(new RegExp(`\\b(has|have) (still )?been waiting on ${SELF} to\\b`, 'g'), (_m, verb: string) =>
      `still ${verb} to`);
}
