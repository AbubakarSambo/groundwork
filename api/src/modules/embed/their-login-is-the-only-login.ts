import { createHmac, timingSafeEqual } from 'crypto';

/**
 * VERIFYING A TOKEN SOMEBODY ELSE MINTED.
 *
 * The customer's server signs a short-lived assertion about who is logged in, and we check it. That
 * is the whole trust model: their login is the only login, there is no Groundwork password for an
 * end user, and no second account for anybody.
 *
 * Written out rather than handed to a JWT library on purpose. This is the one place where a token
 * we did not issue decides who somebody is, and the checks that matter - is it signed with THEIR
 * key, is it recent, is it for THIS organisation - are worth being able to read in one screen. A
 * library would do it and the reasoning would live in its options object.
 */
export interface EmbedClaims {
  /** The participant's externalId. The same id SCIM sends and objectives point at. */
  sub: string;
  /** The org this token is for. Checked, so a token minted for one customer cannot be replayed at another. */
  org: string;
  iat: number;
  exp: number;
}

/** The spec's ceiling. A token good for an hour is a token worth stealing. */
export const MAX_LIFETIME_SECONDS = 300;

export type VerifyResult =
  | { ok: true; claims: EmbedClaims }
  | { ok: false; reason: string };

function b64urlToBuf(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

export function verifyEmbedToken(
  token: string,
  secret: string,
  organizationId: string,
  now: Date = new Date(),
): VerifyResult {
  const parts = (token ?? '').split('.');
  if (parts.length !== 3) return { ok: false, reason: 'Malformed token.' };
  const [headerB64, payloadB64, sigB64] = parts;

  let header: any;
  let claims: any;
  try {
    header = JSON.parse(b64urlToBuf(headerB64).toString('utf8'));
    claims = JSON.parse(b64urlToBuf(payloadB64).toString('utf8'));
  } catch {
    return { ok: false, reason: 'Malformed token.' };
  }

  /*
   * THE ALGORITHM IS OURS TO DECIDE, NOT THE TOKEN'S.
   *
   * Reading `alg` from the header and honouring it is the oldest JWT vulnerability there is: a
   * token arrives saying alg: none, or saying HS256 when the key is RSA, and the verifier obliges.
   * We only ever accept the one algorithm we agreed on, whatever the token claims to be.
   */
  if (header?.alg !== 'HS256') return { ok: false, reason: 'Only HS256 is accepted.' };

  const expected = createHmac('sha256', secret).update(`${headerB64}.${payloadB64}`).digest();
  const given = b64urlToBuf(sigB64);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, reason: 'Signature does not match.' };
  }

  const nowSec = Math.floor(now.getTime() / 1000);
  if (typeof claims.exp !== 'number' || typeof claims.iat !== 'number') {
    return { ok: false, reason: 'A token must carry iat and exp.' };
  }
  if (claims.exp <= nowSec) return { ok: false, reason: 'Token has expired.' };
  /*
   * A LONG-LIVED TOKEN IS REFUSED EVEN THOUGH IT IS VALID.
   *
   * Their server could mint one good for a year and it would verify perfectly. The ceiling is here
   * because the damage from a leaked assertion is bounded by its lifetime and by nothing else, and
   * an integration that quietly sets exp a year out is a thing that happens.
   */
  if (claims.exp - claims.iat > MAX_LIFETIME_SECONDS) {
    return { ok: false, reason: `A token may not be valid for more than ${MAX_LIFETIME_SECONDS} seconds.` };
  }
  /* A little tolerance for a customer's clock running fast, and no more. */
  if (claims.iat > nowSec + 60) return { ok: false, reason: 'Token is issued in the future.' };

  if (!claims.sub) return { ok: false, reason: 'A token must name a person in sub.' };
  if (claims.org !== organizationId) return { ok: false, reason: 'Token is for a different organisation.' };

  return { ok: true, claims: claims as EmbedClaims };
}

/**
 * WHERE THE PANEL IS ALLOWED TO BE FRAMED.
 *
 * An empty list produces `'none'` rather than `*`. A customer who has not finished the setup gets a
 * widget that renders nowhere, which is a support conversation; the other default is their
 * assistant embeddable by anybody, which is not.
 */
export function frameAncestors(domains: string[]): string {
  const clean = (domains ?? []).map((d) => d.trim()).filter(Boolean);
  return clean.length ? clean.join(' ') : "'none'";
}
