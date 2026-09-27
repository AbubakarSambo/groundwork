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
