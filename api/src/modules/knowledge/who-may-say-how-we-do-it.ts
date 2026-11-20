/**
 * WHO MAY PROPOSE THAT A DOCUMENT BECOMES "HOW WE DO IT HERE", AND WHO DECIDES.
 *
 * A document uploaded to a check-in is somebody's file. An approved one becomes what people's own
 * accounts are held up against when they walk through a process - so the two are different things
 * and the gap between them is where the authority sits.
 *
 * ONE ASYMMETRY, THE SAME SHAPE AS THE REST OF THIS PRODUCT. Anybody who can open a check-in can
 * say "this is how we do it"; only an admin can make that true for everybody. Nothing here grants
 * a lead anything they did not already have, and nothing lets an admin be bypassed.
 */

import { mayAddToTheDesk } from './the-desk';

export type Decision = { may: true } | { may: false; because: string };

/**
 * Proposing.
 *
 * A LEAD OR AN ADMIN, and the reasoning is the same as for opening a check-in: these are the people
 * describing how their part of the company works. Somebody who only takes part in other people's
 * check-ins is not setting process, and a proposal from them would be a document about their work
 * arriving on an approval queue as though it were policy.
 */
export function mayPropose(role: string): Decision {
  /* The same people who may add a document to the Desk (the-desk.ts), so the two can never disagree. */
  if (mayAddToTheDesk(role)) return { may: true };
  return { may: false, because: NOT_YOURS_TO_PROPOSE };
}

export const NOT_YOURS_TO_PROPOSE =
  'Proposing how the company does something is for admins and people who run check-ins. You can '
  + 'still share this document inside a check-in, which is what it is for.';

/** Deciding. The person who holds the account, and nobody else. */
export function mayDecide(role: string): Decision {
  if (role === 'ADMIN') return { may: true };
  return { may: false, because: NOT_YOURS_TO_DECIDE };
}

export const NOT_YOURS_TO_DECIDE =
  'Only an admin can make a document how the company does something. Yours is on their list.';

/**
 * THE KEY A CARD IS STORED UNDER, made from the document's own name.
 *
 * Stable and human, because it is what groups a theme across sessions: `dimensionThreadKey` holds
 * this, so "contracting" at day 14 and at day 60 are one thread rather than two unrelated notes.
 *
 * Deliberately not the document id. An id would be unique and meaningless, and the same process
 * re-uploaded next year would start a second thread that nothing connects to the first.
 */
export function keyFor(fileName: string): string {
  const base = fileName.replace(/\.[a-z0-9]+$/i, '');
  const key = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return key || 'how-we-do-it';
}
