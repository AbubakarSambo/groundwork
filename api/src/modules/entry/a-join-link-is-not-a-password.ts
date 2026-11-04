/**
 * A JOIN LINK PROVES YOU WERE GIVEN A LINK.
 *
 * It does not prove you own the address you typed, and for a while this product
 * behaved as though it did: `POST /entry/join-accept` took a join token and any
 * email, found that person's existing account with no organisation scope, and
 * returned a signed session carrying their id, their role and their organisation.
 *
 * A join link is a BROADCAST credential. Its whole purpose is to be handed to a
 * cohort — twenty field officers, a class of franchisees — so everybody who
 * received one could sign in as anybody whose address they could guess, starting
 * with the admin who sent it. On a performance ground that is somebody's
 * employment record.
 *
 * ==========================================================================
 * THE RULE, AND WHY IT IS NOT SOFTER FOR NEW ADDRESSES.
 * ==========================================================================
 *
 * NOTHING IS CREATED AND NOTHING IS SIGNED UNTIL THE ADDRESS ANSWERS. Not for an
 * existing account, and not for an address nobody has seen before.
 *
 * The tempting compromise is to let a brand-new address straight in, on the
 * grounds that there is nothing yet to steal. There is: the ground. Typing a
 * colleague's address gets you a check-in in their name, and an account of the
 * work attributed to them that they never gave. The harm is not access to an old
 * record; it is a false record made in somebody else's name.
 *
 * So both cases send a link, and the link is what does the work.
 *
 * WHAT A PERSON IS TOLD IS THE SAME EITHER WAY. "We have sent a link to that
 * address" — never "welcome back" and never "that address is not registered",
 * because either one turns the join form into a way of asking whether somebody
 * has an account here.
 */

/** Long enough to walk to another device, short enough that a copied link goes stale. */
export const A_JOIN_LINK_LASTS_HOURS = 24;

export interface WhatWeSay {
  sent: true;
  /** Said back so somebody who typed it wrongly can see that they did. */
  to: string;
  says: string;
}

/**
 * The same sentence whether or not that address has an account here.
 *
 * Returning the address is safe — they just typed it — while any difference in
 * WORDING between the two cases would leak whether it is registered.
 */
export function whatToSayAfterAsking(email: string): WhatWeSay {
  return {
    sent: true,
    to: email,
    says:
      `I have sent a link to ${email}. Opening it starts your check-in. `
      + 'If it does not arrive in a minute or two, check the address above and try again.',
  };
}

export type WhyNotJoined =
  | 'that link is not one we know'
  | 'that link has expired'
  | 'that link has already been used';

/** Why a confirmation link did not work, in the words a person reads. */
export function whyThisDidNotWork(reason: WhyNotJoined): string {
  switch (reason) {
    case 'that link has expired':
      return `Join links last ${A_JOIN_LINK_LASTS_HOURS} hours. Ask for a new one from the same page you started on.`;
    case 'that link has already been used':
      return 'That link has already been used. If you are signed out, sign in with the address you used.';
    default:
      return 'That link is not one I recognise. Check you copied all of it, or ask whoever sent it for a new one.';
  }
}
