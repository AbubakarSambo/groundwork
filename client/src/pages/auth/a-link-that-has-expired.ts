/**
 * WHAT THE SERVER SAID ABOUT A LINK FROM ONE OF OUR EMAILS, SORTED INTO WHAT THE PERSON CAN DO.
 *
 * Four answers need different screens:
 *
 *  - 'resent': a sign-up still waiting whose link had run out. The server has already made a new link
 *    and sent it to the same address ("That link had expired, so I have sent a new one to the same
 *    address. Nothing you wrote has been lost."). There is nothing to ask for; the page says it is
 *    on its way.
 *  - 'expired': any other link that has run out: sign-in ("This verification link has expired"),
 *    reset ("This reset link has expired"), set-up ("This invitation link has expired"), or the
 *    general "This link has expired". The person can ask for a fresh one on the spot.
 *  - 'used-confirmed' (B-208): a sign-in link already used, whose address this already confirmed
 *    ("This link has already been used, so your address is confirmed. Sign in from the sign-in
 *    page.", how-long-a-link-lasts.ts's EMAIL_VERIFICATION branch). There is nothing to ask for
 *    either - the address is already proved, and the one thing left to do is sign in - so this is
 *    its own answer rather than folding into 'did-not-work', whose card offers to send a new link
 *    for a problem this one does not have.
 *  - 'did-not-work': a link already used for anything else, one we do not know, or one of the wrong
 *    kind. The page shows "That link didn't work", with one plain message and a way to ask for a
 *    new one (U.2 review).
 *  - null: anything else, such as a password the server refused. The page shows the server's own
 *    sentence where it is.
 *
 * Read from the server's sentence because that is all the server sends. The sentences are in
 * api/src/modules/auth/auth.service.ts (consumeToken's allowExpiredMessage, verifyEmail's pending
 * branch) and how-long-a-link-lasts.ts; auth-link-sentences.spec.ts pins them.
 */
export type WhatTheLinkDid = 'expired' | 'resent' | 'used-confirmed' | 'did-not-work' | null

export function whatTheLinkDid(serverSentence: unknown): WhatTheLinkDid {
  const s = typeof serverSentence === 'string' ? serverSentence : Array.isArray(serverSentence) ? String(serverSentence[0] ?? '') : ''
  if (/had expired, so I have sent a new one/i.test(s)) return 'resent'
  if (/\bhas expired\b/i.test(s)) return 'expired'
  /* B-208: checked before the broader "used" match below, because this one sentence has somewhere
     useful to send the person (sign in) and nothing to ask for, unlike the rest of "used". */
  if (/^This link has already been used, so your address is confirmed\./i.test(s)) return 'used-confirmed'
  /* Used (for anything else), unknown, or the wrong kind: the server's sentences for these all start
     one of two ways. */
  if (/^This link (did not work|has already been used)/i.test(s)) return 'did-not-work'
  return null
}

/** The server's sentence for a waiting sign-up whose link it has already sent again. */
export const WE_SENT_A_NEW_ONE = 'That link had expired, so I have sent a new one to the same address. Nothing you wrote has been lost.'

/** The server's sentence for a sign-in link already used, when nothing of the server's own is on hand. */
export const ALREADY_CONFIRMED = 'This link has already been used, so your address is confirmed. Sign in from the sign-in page.'
