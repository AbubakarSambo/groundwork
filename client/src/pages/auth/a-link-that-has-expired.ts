/**
 * WHAT THE SERVER SAID ABOUT A LINK FROM ONE OF OUR EMAILS, SORTED INTO WHAT THE PERSON CAN DO.
 *
 * Three answers need different screens:
 *
 *  - 'resent': a sign-up still waiting whose link had run out. The server has already made a new link
 *    and sent it to the same address ("That link had expired, so we have sent a new one to the same
 *    address. Nothing you wrote has been lost."). There is nothing to ask for; the page says it is
 *    on its way.
 *  - 'expired': any other link that has run out: sign-in ("This verification link has expired"),
 *    reset ("This reset link has expired"), set-up ("This invitation link has expired"), or the
 *    general "This link has expired". The person can ask for a fresh one on the spot.
 *  - null: anything else: a link already used, or one we do not know. Those stay with LinkProblem and
 *    the server's own sentence, because asking for "a fresh link" is not the answer to them.
 *
 * Read from the server's sentence because that is all the server sends. The sentences are in
 * api/src/modules/auth/auth.service.ts (consumeToken's allowExpiredMessage, verifyEmail's pending
 * branch) and how-long-a-link-lasts.ts; auth-link-sentences.spec.ts pins them.
 */
export type WhatTheLinkDid = 'expired' | 'resent' | null

export function whatTheLinkDid(serverSentence: unknown): WhatTheLinkDid {
  const s = typeof serverSentence === 'string' ? serverSentence : Array.isArray(serverSentence) ? String(serverSentence[0] ?? '') : ''
  if (/had expired, so we have sent a new one/i.test(s)) return 'resent'
  if (/\bhas expired\b/i.test(s)) return 'expired'
  return null
}

/** The server's sentence for a waiting sign-up whose link it has already sent again. */
export const WE_SENT_A_NEW_ONE = 'That link had expired, so we have sent a new one to the same address. Nothing you wrote has been lost.'
