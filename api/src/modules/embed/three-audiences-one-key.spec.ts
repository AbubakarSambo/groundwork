import { EmbedSessionGuard } from './embed-session.guard';
import { UnauthorizedException } from '@nestjs/common';

/**
 * THREE KINDS OF TOKEN, ONE SIGNING KEY, AND THEY MUST NOT BE INTERCHANGEABLE.
 *
 * A person's browser session, a machine credential, and a panel acting for one named person inside
 * a customer's app. All three verify identically, so the `typ` marker is the only thing keeping
 * them apart and it is checked before anything else is read.
 *
 * The one that matters most: a MACHINE token must not reach the assistant. It carries an
 * organisation and nobody in particular, and every lane is scoped to the person asking - so without
 * this a customer's integration credential could ask questions as no one, and "what am I on" would
 * have to invent an answer. Driven against the running server, where a machine token, a person's
 * session token and no token at all were each refused.
 */
function guard(claims: any) {
  const jwt: any = { verifyAsync: jest.fn(async () => { if (claims === 'bad') throw new Error('nope'); return claims; }) };
  const req: any = { headers: { authorization: 'Bearer t' } };
  const ctx: any = { switchToHttp: () => ({ getRequest: () => req }) };
  const prisma: any = { person: { findUnique: jest.fn(async () => ({ deactivatedAt: null })) } };
  return { g: new EmbedSessionGuard(jwt, prisma), ctx, req };
}

describe('three audiences, one key', () => {
  it('accepts a panel session and hands the lane the person it is for', async () => {
    const { g, ctx, req } = guard({ typ: 'embed', org: 'org-a', pid: 'p1', sub: 'u-1' });
    await expect(g.canActivate(ctx)).resolves.toBe(true);
    expect(req.panel).toEqual({ organizationId: 'org-a', personId: 'p1', externalId: 'u-1' });
  });

  it('refuses a machine token EVEN IF it carries everything a panel token would', async () => {
    /*
     * THIS TEST WAS WEAK AND I FOUND OUT BY BREAKING THE CODE.
     *
     * The first version passed a machine token with no `pid`, so it was refused by the "who is this
     * for" check rather than by the type check - and deleting the type check entirely left the
     * suite green. Defence resting on a machine token happening to lack a field is not defence; the
     * day one carries a `pid` for some other reason, the boundary is gone and nothing says so.
     *
     * So the token here is otherwise perfect. The ONLY thing wrong with it is what it is.
     */
    const { g, ctx } = guard({ typ: 'machine', org: 'org-a', pid: 'p1', sub: 'gwc_1', scopes: ['chat:write'] });
    await expect(g.canActivate(ctx)).rejects.toThrow(/not a panel session/i);
  });

  it("refuses a person's browser session, for the same reason", async () => {
    const { g, ctx } = guard({ sub: 'user-1', email: 'a@b.test', org: 'org-a', pid: 'p1' });
    await expect(g.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses a panel token that does not say who it is for', async () => {
    /* Without a person, every lane would have to invent one. */
    const { g, ctx } = guard({ typ: 'embed', org: 'org-a' });
    await expect(g.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses a missing or unverifiable token', async () => {
    const { g, ctx, req } = guard({ typ: 'embed', org: 'o', pid: 'p' });
    req.headers.authorization = '';
    await expect(g.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);

    const bad = guard('bad');
    await expect(bad.g.canActivate(bad.ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('says the session expired rather than blaming the person', async () => {
    /* The panel re-handshakes silently; the message is for the rare case somebody sees it. */
    const bad = guard('bad');
    await expect(bad.g.canActivate(bad.ctx)).rejects.toThrow(/expired|reconnect/i);
  });
});
