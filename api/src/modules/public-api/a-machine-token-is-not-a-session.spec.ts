import { MachineTokenGuard } from './machine-token.guard';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { resolveGrantedScopes } from './scopes';

/**
 * THE TWO AUDIENCES ARE SIGNED BY THE SAME SECRET, AND MUST NOT BE INTERCHANGEABLE.
 *
 * A person's session token and a machine's access token are both JWTs we signed. Without a marker
 * distinguishing them, a logged-in user's browser token authenticates against the integration API -
 * and since a session token carries no `scopes` claim, whether that mattered would depend entirely
 * on the scope check finding an empty array. That is not a boundary, it is a coincidence.
 *
 * So `typ: 'machine'` is checked before anything else is read off the claims, and a route with no
 * declared scope is refused rather than allowed: the safe default for a forgotten annotation on a
 * public endpoint is closed.
 */
function guard(claims: any, requiredScope?: string) {
  const jwt: any = { verifyAsync: jest.fn(async () => { if (claims === 'bad') throw new Error('nope'); return claims; }) };
  const reflector: any = { getAllAndOverride: jest.fn(() => requiredScope) };
  const req: any = { headers: { authorization: 'Bearer t' } };
  const ctx: any = { switchToHttp: () => ({ getRequest: () => req }), getHandler: () => null, getClass: () => null };
  /* Every call is written down and counted (the-api-is-watched.ts); neither is what this spec is about. */
  const prisma: any = { apiCall: { count: jest.fn(async () => 0), create: jest.fn(() => Promise.resolve()) } };
  return { g: new MachineTokenGuard(jwt, reflector, prisma), ctx, req };
}

describe('a machine token is not a session', () => {
  it("refuses a token without the machine marker, however well signed", async () => {
    const { g, ctx } = guard({ sub: 'user-1', org: 'org1' }, 'subjects:write');
    await expect(g.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('carries the source system when the token has one, so a replaced credential is the same roster', async () => {
    const { g, ctx, req } = guard(
      { sub: 'gwc_2', org: 'org-a', scopes: ['graph:write'], typ: 'machine', src: 'workday' },
      'graph:write',
    );
    await expect(g.canActivate(ctx)).resolves.toBe(true);
    expect(req.machine.sourceSystem).toBe('workday');
    /* And it is NOT the client id: that is the whole bug — the client id is random on every
       issue, so keying the roster on it duplicated everybody whenever a credential was rotated. */
    expect(req.machine.sourceSystem).not.toBe(req.machine.clientId);
  });

  it('accepts one with it, and hands the org off the token rather than the request', async () => {
    /* The org is never taken from a path, a body or a header - a customer's system cannot name an
       organisation it does not hold a credential for, because it never names one at all. */
    const { g, ctx, req } = guard({ sub: 'gwc_1', org: 'org-a', scopes: ['subjects:write'], typ: 'machine' }, 'subjects:write');
    await expect(g.canActivate(ctx)).resolves.toBe(true);
    expect(req.machine).toEqual({
      organizationId: 'org-a', clientId: 'gwc_1', scopes: ['subjects:write'],
      /* No `src` on this token, so the source system falls back to the client id — which is what
         every credential issued before the two were split wrote its people under. Changing it for
         them would orphan every row they have pushed. */
      sourceSystem: 'gwc_1',
      /* A token with no fence means the whole organisation - which is what every credential issued
         before fences existed means, and the only default that does not lock working integrations
         out on deploy. */
      boundToPersonExternalIds: [],
    });
  });

  it('and carries the fence off the token, so a route added later is bounded without asking', async () => {
    /*
     * Carried on the caller rather than looked up per route. The other arrangement fails silently:
     * a new endpoint that simply forgets to check, and reads everything.
     */
    const { g, ctx, req } = guard(
      { sub: 'gwc_1', org: 'org-a', scopes: ['subjects:write'], typ: 'machine', fence: ['lv-sahar'] },
      'subjects:write',
    );
    await expect(g.canActivate(ctx)).resolves.toBe(true);
    expect(req.machine.boundToPersonExternalIds).toEqual(['lv-sahar']);
  });

  it('refuses a route that declares no scope, rather than letting it through', async () => {
    const { g, ctx } = guard({ sub: 'gwc_1', org: 'org-a', scopes: ['subjects:write'], typ: 'machine' }, undefined);
    await expect(g.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses a scope the token does not hold', async () => {
    const { g, ctx } = guard({ sub: 'gwc_1', org: 'org-a', scopes: ['findings:read'], typ: 'machine' }, 'subjects:write');
    await expect(g.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses a missing or malformed header before it verifies anything', async () => {
    const { g, ctx, req } = guard({ typ: 'machine' }, 'subjects:write');
    req.headers.authorization = '';
    await expect(g.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('a token may narrow what its credential holds, never widen it', () => {
  it('defaults to everything the credential was issued with', () => {
    expect(resolveGrantedScopes(['a', 'b'])).toEqual({ ok: true, scopes: ['a', 'b'] });
  });

  it('allows a subset, for a script that only ever reads', () => {
    expect(resolveGrantedScopes(['a', 'b'], 'a')).toEqual({ ok: true, scopes: ['a'] });
  });

  it('refuses anything outside, rather than quietly trimming it', () => {
    /* Trimming hands back a token that looks like the one they asked for and does less, which is
       how an integration fails at 3am with a permission error nobody traces to a config typo. */
    expect(resolveGrantedScopes(['a'], 'a b')).toEqual({ ok: false, unheld: ['b'] });
  });
});

describe('every way of failing to authenticate looks the same', () => {
  it('an unknown client id, a wrong secret and a revoked pair all return null', async () => {
    /* Telling them apart lets anybody enumerate which client ids exist, and "revoked" in particular
       tells an attacker a real integration used to live here. Verified on the running server too:
       all three answer "Those credentials were not accepted." */
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('right', 4);
    const mk = (row: any) => new CredentialsService({ apiCredential: { findUnique: async () => row } } as any);

    expect(await mk(null).verify('gwc_nope', 'right')).toBeNull();
    expect(await mk({ clientSecretHash: hash, revokedAt: null }).verify('gwc_1', 'wrong')).toBeNull();
    expect(await mk({ clientSecretHash: hash, revokedAt: new Date() }).verify('gwc_1', 'right')).toBeNull();
    expect(await mk({ clientSecretHash: hash, revokedAt: null }).verify('gwc_1', 'right')).not.toBeNull();
  });
});
