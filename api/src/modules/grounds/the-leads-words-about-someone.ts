/**
 * WHAT THE LEAD WROTE ABOUT A PERSON IS FOR THE LEAD ALONE (U.6 review, tightened in the U.7 review).
 *
 * `roleAsDescribed` is mostly the lead's own sentence about someone, typed when they were added:
 * "Daniel - Your sales manager, who you said is not meeting his agreed targets for pipeline
 * building and coaching." Read live on Daniel's invitation, under "Your part in this". It judges
 * him, it speaks to the lead ("who you said"), and it is the lead's private note, which a
 * participant never reads (the settled privacy rules).
 *
 * Until the U.7 review it also went to every admin of the organisation, as "someone who runs the
 * check-in". Read live: Otieno, an admin who is not in Wanjiru's check-in, opened its Context page
 * and read "Baraka. Your note: Baraka is a member of the team...". It was not his note, and a lead's
 * private notes are private, always. The row does not record who typed it, so it is served only to
 * the check-in's lead (its initiator), who is the person it is written by and for. Everyone else,
 * admins included, gets nothing in its place.
 */
export function theLeadsWordsAbout(p: { roleAsDescribed?: string | null }, readerLeadsThisCheckIn: boolean): string | null {
  return readerLeadsThisCheckIn ? (p.roleAsDescribed ?? null) : null;
}

/**
 * AND IN THAT PERSON'S OWN SESSION, THE MODEL IS NOT HANDED THEM EITHER (request 36, route 3).
 *
 * The session prompt carried `roleAsDescribed` three times: "The person who set this up described
 * this person's part in it as: …", `PRIOR_CONTEXT`, and "who described their role as" in the plan
 * for the session. For somebody the lead invited, that is the lead's sentence about them, and a model
 * that has it can say it back to the very person it is about. The row does not record who wrote it,
 * so only the lead's own row counts as their own words: it is written from their own setup. Anybody
 * else is asked, and what they say goes on the record in their own words.
 */
export function aRoleInTheirOwnWords(p: { roleAsDescribed?: string | null; partyType?: string | null } | null | undefined): string | null {
  if (!p || p.partyType !== 'INITIATOR') return null;
  return p.roleAsDescribed ?? null;
}

/**
 * THE READ-SIDE NET (decision 30, run 19 and goals-1, 30 September 2026).
 *
 * Structural fixes stop a private description being HANDED to something that writes for a wider
 * reader. This is the second guard, for whatever gets past that: if a sentence a non-lead reader is
 * about to see carries a long run of a lead's private description in its own words, the sentence is
 * dropped for that reader, never for the lead. It never touches what the person themselves said -
 * only sentences the product or a model wrote, which is everything this runs over.
 *
 * "Long run" is six words in a row, case- and punctuation-insensitive, because a short overlap
 * ("own the relationships") is ordinary language two independent sentences can share; six words
 * running together is the description being said back.
 */
const A_GIVEAWAY_RUN = 6;

function normalisedWords(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

function theGiveawayRunsIn(description: string | null | undefined): string[] {
  const words = normalisedWords(description ?? '');
  if (words.length < A_GIVEAWAY_RUN) return [];
  const runs: string[] = [];
  for (let i = 0; i + A_GIVEAWAY_RUN <= words.length; i++) {
    runs.push(words.slice(i, i + A_GIVEAWAY_RUN).join(' '));
  }
  return runs;
}

/**
 * Takes out any sentence of `text` that carries six or more of a private description's own words in
 * a row. `descriptions` is every private description on the ground (every party's `roleAsDescribed`
 * and `remitAsGiven`) - the reader is not who is being described, so this cannot know which one a
 * given sentence might be echoing. Returns `text` unchanged for the lead who wrote them.
 */
export function withoutTheLeadsDescriptionOfAnyone(
  text: string | null | undefined,
  descriptions: (string | null | undefined)[],
  readerLeadsThisCheckIn: boolean,
): string | null {
  if (!text) return text ?? null;
  if (readerLeadsThisCheckIn) return text;
  const runs = [...new Set(descriptions.flatMap(theGiveawayRunsIn))];
  if (!runs.length) return text;
  const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text];
  const kept = sentences.filter((s) => {
    const words = normalisedWords(s).join(' ');
    return !runs.some((r) => words.includes(r));
  });
  const result = kept.join(' ').replace(/\s+/g, ' ').trim();
  return result || null;
}
