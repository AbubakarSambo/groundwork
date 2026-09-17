/**
 * SAYING WHAT AN AGREEMENT MEANS IS NOT ORDINARY WORK.
 *
 * Most of this module is somebody doing their job: recording a figure, answering a question about a
 * difference, saying which explanation does not fit. Any member of the organisation may do that,
 * and should — the person who knows why the VAT return is lower is rarely an admin.
 *
 * A few acts are different in kind. Saying "this version is what we signed", "it was executed",
 * "that is what the clause says": each of those binds the organisation to a reading of a contract,
 * and the whole apparatus around them exists so that one side's reading cannot quietly become the
 * agreement. Leaving them open to anybody with an account undoes that from the inside.
 *
 * THIS IS MINE, FROM THE DAY I BUILT IT. The controller had `JwtAuthGuard` and nothing else, so
 * every one of those acts was open to every member — and every route took a `:groundId` it never
 * used, so a URL under one check-in could amend an agreement belonging to another in the same
 * organisation. Found in an audit of my own work rather than by anybody hitting it.
 *
 * WHO, THEN. An admin of the organisation, or the person who set the check-in up. Not "anybody in
 * the party", because a party is an organisation and everybody in it would be everybody; and not
 * admins alone, because the lead running a contract review is frequently not one.
 */

export type WhatIsBeingDone =
  /** Recording a figure, answering about a difference, ruling an explanation out. */
  | 'the work'
  /** Saying what the agreement is, or was, or says. */
  | 'speaking for this side';

export interface WhoIsAsking {
  userId: string;
  role: string;
  /** The person who set this check-in up. */
  initiatorId: string;
}

export function whyThisIsNotYoursToSay(
  what: WhatIsBeingDone,
  who: WhoIsAsking,
): string | null {
  if (what === 'the work') return null;
  if (who.role === 'ADMIN') return null;
  if (who.userId === who.initiatorId) return null;

  return (
    'Saying what an agreement says, or that a version is signed, binds your organisation to a '
    + 'reading of it. That is for an admin or whoever set this check-in up - anybody can record a '
    + 'figure or answer a question about one.'
  );
}
