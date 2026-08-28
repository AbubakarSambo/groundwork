import { verifyEmbedToken, frameAncestors, MAX_LIFETIME_SECONDS } from './their-login-is-the-only-login';
import { createHmac } from 'crypto';

/**
 * A TOKEN WE DID NOT ISSUE DECIDES WHO SOMEBODY IS.
 *
 * That is the whole trust model of the embed - their login is the only login - and it is the one
 * place in the product where an assertion minted elsewhere is accepted. Every case below was also
 * driven against the running server; these hold them.
 */
const SECRET = 'gwe_test_secret';
const ORG = 'org-a';
const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');

function mint(claims: any, opts: { alg?: string; secret?: string } = {}) {
  const h = b64({ alg: opts.alg ?? 'HS256', typ: 'JWT' });
  const p = b64(claims);
  const sig = createHmac('sha256', opts.secret ?? SECRET).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${sig}`;
}

const now = new Date('2026-08-28T12:00:00Z');
const sec = Math.floor(now.getTime() / 1000);
const good = { sub: 'u-1', org: ORG, iat: sec, exp: sec + 120 };

describe('their login is the only login', () => {
  it('accepts a token their server signed', () => {
    const r = verifyEmbedToken(mint(good), SECRET, ORG, now);
    expect(r.ok).toBe(true);
    expect((r as any).claims.sub).toBe('u-1');
  });

  it('refuses the algorithm the token asks for, and only accepts the one we agreed', () => {
    /*
     * THE OLDEST JWT VULNERABILITY THERE IS. A token arrives saying alg: none and a verifier that
     * honours the header obliges. We never read `alg` as an instruction, only as a claim to check.
     */
    const h = b64({ alg: 'none', typ: 'JWT' });
    const p = b64(good);
    expect(verifyEmbedToken(`${h}.${p}.`, SECRET, ORG, now).ok).toBe(false);
    expect(verifyEmbedToken(mint(good, { alg: 'HS512' }), SECRET, ORG, now).ok).toBe(false);
  });

  it('refuses a signature made with a different key', () => {
    expect(verifyEmbedToken(mint(good, { secret: 'someone-elses' }), SECRET, ORG, now).ok).toBe(false);
  });

  it('refuses a token minted for another organisation', () => {
    /* Otherwise a token from one customer replays at another, and the org is the tenancy boundary. */
    const r = verifyEmbedToken(mint({ ...good, org: 'org-b' }), SECRET, ORG, now);
    expect(r).toEqual({ ok: false, reason: 'Token is for a different organisation.' });
  });

  it('refuses an expired one', () => {
    expect(verifyEmbedToken(mint({ ...good, exp: sec - 1 }), SECRET, ORG, now).ok).toBe(false);
  });

  it('refuses a LONG-LIVED one even though it verifies perfectly', () => {
    /*
     * Their server could mint one good for a year and the signature would be flawless. The damage
     * from a leaked assertion is bounded by its lifetime and by nothing else, and an integration
     * quietly setting exp a year out is a thing that happens.
     */
    const r = verifyEmbedToken(mint({ ...good, exp: sec + 86_400 }), SECRET, ORG, now);
    expect(r.ok).toBe(false);
    expect((r as any).reason).toMatch(new RegExp(`${MAX_LIFETIME_SECONDS} seconds`));
  });

  it('refuses one issued in the future beyond a little clock tolerance', () => {
    expect(verifyEmbedToken(mint({ ...good, iat: sec + 3600, exp: sec + 3660 }), SECRET, ORG, now).ok).toBe(false);
    /* A customer's clock a few seconds fast is not an attack. */
    expect(verifyEmbedToken(mint({ ...good, iat: sec + 10, exp: sec + 130 }), SECRET, ORG, now).ok).toBe(true);
  });

  it('refuses one with no expiry at all rather than treating it as forever', () => {
    expect(verifyEmbedToken(mint({ sub: 'u-1', org: ORG }), SECRET, ORG, now).ok).toBe(false);
  });

  it('refuses malformed input without throwing', () => {
    for (const t of ['', 'a', 'a.b', 'a.b.c.d', 'not.base64.here', '..']) {
      expect(() => verifyEmbedToken(t, SECRET, ORG, now)).not.toThrow();
      expect(verifyEmbedToken(t, SECRET, ORG, now).ok).toBe(false);
    }
  });
});

describe('where the panel may be framed', () => {
  it("an unfinished setup renders nowhere rather than everywhere", () => {
    /* The other default is a customer's assistant embeddable by anybody, which is not a support
       conversation, it is an incident. */
    expect(frameAncestors([])).toBe("'none'");
    expect(frameAncestors(['  ', ''])).toBe("'none'");
  });

  it('lists the origins a customer registered', () => {
    expect(frameAncestors(['https://a.test', 'https://b.test'])).toBe('https://a.test https://b.test');
  });
});
