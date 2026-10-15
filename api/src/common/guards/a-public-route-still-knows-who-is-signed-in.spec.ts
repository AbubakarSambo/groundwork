import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { readFileSync } from 'fs';
import { join } from 'path';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IS_OPTIONAL_AUTH_KEY } from '../decorators/optional-auth.decorator';

/**
 * A PUBLIC ROUTE STILL KNOWS WHO IS SIGNED IN, WHEN IT ASKS TO. The guard returned before passport
 * ran on every public route, so the invite-accept route's "resume in this browser" branch was
 * unreachable: every returning participant was emailed a fresh link. Opt-in per route, because the
 * Google OAuth callback's req.user is the Google profile and must not be trampled by the JWT strategy.
 */
const ctxWith = (flags: Record<string, boolean>): ExecutionContext =>
  ({ getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => ({}) }), __flags: flags }) as any;

const reflector = { getAllAndOverride: (key: string, targets: any[]) => false } as unknown as Reflector;

function guardFor(flags: Record<string, boolean>) {
  const r = { getAllAndOverride: (key: string) => !!flags[key] } as unknown as Reflector;
  return new JwtAuthGuard(r);
}

describe('the guard', () => {
  it('lets a plain public route through without running passport', () => {
    const g = guardFor({ [IS_PUBLIC_KEY]: true });
    expect(g.canActivate(ctxWith({}))).toBe(true);
  });

  it('on an optional-auth public route, a missing or bad token is nobody rather than a 401', () => {
    const g = guardFor({ [IS_PUBLIC_KEY]: true, [IS_OPTIONAL_AUTH_KEY]: true });
    expect(g.handleRequest(null, null, null, ctxWith({}))).toBeNull();
    expect(g.handleRequest(new Error('expired'), null, null, ctxWith({}))).toBeNull();
    expect(g.handleRequest(null, { id: 'u1' }, null, ctxWith({}))).toEqual({ id: 'u1' });
  });

  it('and on a protected route a missing token is still refused', () => {
    const g = guardFor({});
    expect(() => g.handleRequest(null, null, null, ctxWith({}))).toThrow(/Your sign-in has run out/);
    void reflector;
  });
});

describe('who opted in', () => {
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  it('the invite-accept route did; the Google callback did not', () => {
    const participants = strip(readFileSync(join(__dirname, '..', '..', 'modules', 'participants', 'participants.controller.ts'), 'utf8'));
    /* A limit of its own sits in the stack since A9; the two decorators that matter are still both there, in order. */
    expect(participants).toMatch(/@Public\(\)\s*@OptionalAuth\(\)\s*(?:@Throttle\([^)]*\)\s*)?@Post\('accept'\)/);
    const auth = strip(readFileSync(join(__dirname, '..', '..', 'modules', 'auth', 'auth.controller.ts'), 'utf8'));
    expect(auth).not.toContain('@OptionalAuth()');
  });
});
