/**
 * HOW LONG AN INVITE LASTS: ONE NUMBER, IN ONE PLACE.
 *
 * Two lifetimes for one kind of link: fourteen days at creation, ninety at an address change. The
 * longer one is the right one - an invitation is a standing offer to take part, and the person it
 * went to is often the last to open their mail about a project - and loadByToken's own comment already
 * argued for it. Ninety, written once, read by every writer of `inviteTokenExpiresAt`.
 *
 * And nobody was warned before one lapsed. The daily sweep in grounds.cron.ts mails the invitee two
 * days out, and tells the lead when one has lapsed, so a dead link is a fact somebody knows rather
 * than a person who quietly never arrived.
 */
export const AN_INVITE_LASTS_DAYS = 90;
export const WARN_BEFORE_IT_LAPSES_DAYS = 2;

export function inviteExpiryFrom(now: Date = new Date()): Date {
  return new Date(now.getTime() + AN_INVITE_LASTS_DAYS * 24 * 60 * 60 * 1000);
}
