import { createHmac } from 'crypto';

/**
 * SIGNING THE ASSERTION A CUSTOMER'S SERVER SIGNS.
 *
 * The whole claim of the public API is that a company can run Groundwork inside
 * their own system. Our back office is a company running Groundwork inside their
 * own system — so if the assistant does not appear here, through the same door,
 * we are selling something we have never used.
 *
 * WRITTEN OUT, AND IMPORTING NOTHING FROM THE PRODUCT. There is a function in
 * `modules/embed` that verifies exactly this token, and calling into it would be
 * quicker and would prove nothing: the point is to hold the same shared secret a
 * customer holds and produce a token from the outside. If this file ever imports
 * the verifier, the test has been replaced by a mirror.
 *
 * Twenty lines because the format is not ours to invent — HS256 over
 * `header.payload`, the claims the spec names, and a lifetime the API will
 * refuse if we get it wrong. Getting it wrong is the useful part: a customer
 * writing this for the first time has exactly this to get right, and we should
 * find out here rather than in their support ticket.
 */

/** The API refuses anything longer. A token good for an hour is a token worth stealing. */
export const LIFETIME_SECONDS = 120;

export interface WhoIsLookingAtThePage {
  /** Their externalId in Groundwork — for us, the ops person's key, which is what SCIM sends. */
  sub: string;
  /** The organisation this token is for. Checked at the other end, so it cannot be replayed elsewhere. */
  org: string;
}

const b64url = (b: Buffer) =>
  b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function mintEmbedToken(
  who: WhoIsLookingAtThePage,
  secret: string,
  now: Date = new Date(),
): string {
  if (!secret) throw new Error('No embed secret. Nothing can be signed without the shared key.');
  if (!who.sub) throw new Error('A token has to say who is looking at the page.');
  if (!who.org) throw new Error('A token has to name the organisation it is for.');

  const issuedAt = Math.floor(now.getTime() / 1000);
  /*
   * `alg` is stated because the format requires it, and it is not a choice the
   * token gets to make — the other end accepts HS256 and nothing else, whatever
   * a token claims to be. That refusal is the oldest lesson in JWT and it is
   * theirs to enforce, not ours to rely on.
   */
  const header = b64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = b64url(
    Buffer.from(
      JSON.stringify({
        sub: who.sub,
        org: who.org,
        iat: issuedAt,
        exp: issuedAt + LIFETIME_SECONDS,
      }),
    ),
  );
  const signature = b64url(createHmac('sha256', secret).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${signature}`;
}

/** Why the panel cannot be shown yet, in words, or null when it can. */
export function whyThePanelCannotOpen(integration: {
  enabled?: boolean | null;
  baseUrl?: string | null;
  organizationId?: string | null;
  embedSecret?: string | null;
}): string | null {
  if (!integration.enabled) {
    return 'The connection to Groundwork is switched off. Turn it on under Groundwork.';
  }
  if (!integration.baseUrl) return 'No Groundwork address is set, so there is nothing to call.';
  if (!integration.organizationId) {
    return 'No Groundwork organisation is set. The panel signs a token that names one, and a token naming nobody is refused.';
  }
  if (!integration.embedSecret) {
    return 'No shared signing key is set. Groundwork will not accept a token it cannot check.';
  }
  return null;
}
