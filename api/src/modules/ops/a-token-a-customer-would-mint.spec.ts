/**
 * OUR SERVER, SIGNING WHAT A CUSTOMER'S SERVER SIGNS.
 *
 * The one test that says whether the public API is real: our back office is a
 * company running Groundwork inside their own system, and if the assistant does
 * not appear here through the published door, we are selling something we have
 * never used.
 *
 * Verified against the product's OWN verifier — the one a customer's token meets
 * — because a mint checked only by its own spec proves the two halves agree with
 * themselves and nothing else. This spec imports it; the minting code must not,
 * and its own guard holds that.
 */
import { verifyEmbedToken, MAX_LIFETIME_SECONDS } from '../embed/their-login-is-the-only-login';
import { mintEmbedToken, LIFETIME_SECONDS, whyThePanelCannotOpen } from './a-token-a-customer-would-mint';

const SECRET = 'a-shared-key-the-customer-holds';
const ORG = 'org-groundwork';

describe('a token we mint', () => {
  it('is accepted by the verifier a customer’s token meets', () => {
    const token = mintEmbedToken({ sub: 'hafsah', org: ORG }, SECRET);
    const result = verifyEmbedToken(token, SECRET, ORG);
    expect(result.ok).toBe(true);
  });

  it('names the person, using the same id SCIM sends', () => {
    const token = mintEmbedToken({ sub: 'hafsah', org: ORG }, SECRET);
    const result = verifyEmbedToken(token, SECRET, ORG);
    expect(result.ok && result.claims.sub).toBe('hafsah');
  });

  it('is refused by anybody else’s key', () => {
    const token = mintEmbedToken({ sub: 'hafsah', org: ORG }, SECRET);
    expect(verifyEmbedToken(token, 'a-different-key', ORG)).toMatchObject({ ok: false });
  });

  it('cannot be replayed at another organisation', () => {
    const token = mintEmbedToken({ sub: 'hafsah', org: ORG }, SECRET);
    expect(verifyEmbedToken(token, SECRET, 'org-somebody-else')).toMatchObject({ ok: false });
  });

  it('lives well inside the ceiling the API enforces', () => {
    /* A token good for an hour is a token worth stealing, and the API refuses
       one anyway — better to find that out here than in a support ticket. */
    expect(LIFETIME_SECONDS).toBeLessThanOrEqual(MAX_LIFETIME_SECONDS);
  });

  it('has expired once its life is over', () => {
    const minted = new Date('2026-09-05T10:00:00Z');
    const token = mintEmbedToken({ sub: 'hafsah', org: ORG }, SECRET, minted);
    const later = new Date(minted.getTime() + (LIFETIME_SECONDS + 5) * 1000);
    expect(verifyEmbedToken(token, SECRET, ORG, later)).toMatchObject({ ok: false });
  });

  it('refuses to sign without a key, rather than producing something unusable', () => {
    expect(() => mintEmbedToken({ sub: 'hafsah', org: ORG }, '')).toThrow(/shared key/);
  });

  it('refuses to sign a token that names nobody', () => {
    expect(() => mintEmbedToken({ sub: '', org: ORG }, SECRET)).toThrow(/who is looking/);
  });
});

describe('why the panel cannot open', () => {
  const connected = { enabled: true, baseUrl: 'https://api.myground.work', organizationId: ORG, embedSecret: SECRET };

  it('says nothing when everything is there', () => {
    expect(whyThePanelCannotOpen(connected)).toBeNull();
  });

  it.each([
    ['enabled', /switched off/],
    ['baseUrl', /nothing to call/],
    ['organizationId', /naming nobody is refused/],
    ['embedSecret', /cannot check/],
  ])('names %s when it is missing, rather than showing an empty panel', (field, expected) => {
    /* Every state this can be in is something somebody can fix, and a launcher
       that appears and does nothing teaches people to stop pressing it. */
    expect(whyThePanelCannotOpen({ ...connected, [field]: null })).toMatch(expected);
  });
});
