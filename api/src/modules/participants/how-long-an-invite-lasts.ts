/**
 * HOW LONG AN INVITE LASTS: ONE NUMBER, IN ONE PLACE.
 *
 * FOURTEEN DAYS, by Hafsah's decision of 26 September (U.3), as the prototype says: "Invitation links
 * last 14 days. You don't need a new invitation, just a fresh link." It was ninety, on the argument
 * that the person invited is often the last to open their mail. What changed is that a lapsed link is
 * no longer a dead end: the expired-link page asks for the address and sends a fresh link to the
 * person it was meant for (POST /participants/fresh-link), so being late costs one form, not a chase.
 *
 * And nobody is left unwarned. The daily sweep in grounds.cron.ts mails the invitee two days out, and
 * tells the lead when one has lapsed, so a dead link is a fact somebody knows rather than a person
 * who quietly never arrived.
 */
export const AN_INVITE_LASTS_DAYS = 14;
export const WARN_BEFORE_IT_LAPSES_DAYS = 2;

export function inviteExpiryFrom(now: Date = new Date()): Date {
  return new Date(now.getTime() + AN_INVITE_LASTS_DAYS * 24 * 60 * 60 * 1000);
}
