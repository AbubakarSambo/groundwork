import { GoogleCallbackGuard } from './google-callback.guard';
import { AuthController } from './auth.controller';

/**
 * THE WAY BACK FROM GOOGLE ALWAYS LANDS ON A PAGE. U.2.
 *
 * Pressing Cancel at Google, a refused code, or a profile the strategy turns down used to throw in
 * the guard and leave a JSON "Unauthorized" on the API's origin. Now the guard hands over no user
 * and the controller sends the person to the client's "Google sign-in didn't finish" page.
 */
describe('the callback guard', () => {
  const guard = new GoogleCallbackGuard();
  const ctx: any = {};

  it('passes a real user through unchanged', () => {
    const user = { googleId: 'g1', email: 'a@b.test' };
    expect(guard.handleRequest(null, user, undefined, ctx)).toBe(user);
  });

  it('turns Cancel at Google (no user, a message from Passport) into no user, not a throw', () => {
    expect(guard.handleRequest(null, false, { message: 'access_denied' }, ctx)).toBeNull();
  });

  it('and an error from Google or the strategy too', () => {
    expect(guard.handleRequest(new Error('Google has not verified that email address.'), false, undefined, ctx)).toBeNull();
  });
});

describe('the callback', () => {
  const redirects: string[] = [];
  const res = { redirect: (to: string) => { redirects.push(to); return to; } };
  const config = { get: (k: string) => (k === 'google.frontendUrl' ? 'http://localhost:5173' : undefined) };

  beforeEach(() => { redirects.length = 0; });

  it('with no user, goes to "Google sign-in didn\'t finish" and touches no account', async () => {
    const auth = { findOrCreateGoogleUser: jest.fn(), createOAuthExchangeCode: jest.fn() };
    const controller = new AuthController(auth as any, config as any);
    await controller.googleCallback({ user: null }, res);
    expect(redirects).toEqual(['http://localhost:5173/google-failed']);
    expect(auth.findOrCreateGoogleUser).not.toHaveBeenCalled();
  });

  it('when finishing fails after Google, goes to the same page', async () => {
    const auth = { findOrCreateGoogleUser: jest.fn(async () => { throw new Error('Account is deactivated'); }), createOAuthExchangeCode: jest.fn() };
    const controller = new AuthController(auth as any, config as any);
    await controller.googleCallback({ user: { email: 'a@b.test' } }, res);
    expect(redirects).toEqual(['http://localhost:5173/google-failed']);
  });

  it('and a sign-in that works still goes to the client with a one-time code', async () => {
    const auth = {
      findOrCreateGoogleUser: jest.fn(async () => ({ token: 'jwt', isNewUser: false, needsOrgName: false })),
      createOAuthExchangeCode: jest.fn(async () => 'code-1'),
    };
    const controller = new AuthController(auth as any, config as any);
    await controller.googleCallback({ user: { email: 'a@b.test' } }, res);
    expect(redirects).toEqual(['http://localhost:5173/auth/google/callback?code=code-1&new=false&nameOrg=false']);
  });

  it('carries the place back from `state`, and never an outside address (U.3 review)', async () => {
    const auth = {
      findOrCreateGoogleUser: jest.fn(async () => ({ token: 'jwt', isNewUser: false, needsOrgName: false })),
      createOAuthExchangeCode: jest.fn(async () => 'code-1'),
    };
    const controller = new AuthController(auth as any, config as any);
    await controller.googleCallback({ user: { email: 'a@b.test' }, query: { state: '/j/coamana-6rr7' } }, res);
    expect(auth.findOrCreateGoogleUser).toHaveBeenLastCalledWith({ email: 'a@b.test' }, '/j/coamana-6rr7');
    await controller.googleCallback({ user: { email: 'a@b.test' }, query: { state: '//evil.test' } }, res);
    expect(auth.findOrCreateGoogleUser).toHaveBeenLastCalledWith({ email: 'a@b.test' }, null);
    expect(redirects).toEqual([
      'http://localhost:5173/auth/google/callback?code=code-1&new=false&nameOrg=false&next=%2Fj%2Fcoamana-6rr7',
      'http://localhost:5173/auth/google/callback?code=code-1&new=false&nameOrg=false',
    ]);
  });

  it('from a link or with a domain match, sends them to the confirmation page with the waiting token (U.3 review)', async () => {
    const auth = { findOrCreateGoogleUser: jest.fn(async () => ({ pendingToken: 'wait-1' })), createOAuthExchangeCode: jest.fn() };
    const controller = new AuthController(auth as any, config as any);
    await controller.googleCallback({ user: { email: 'a@coamana.test' }, query: { state: '/j/coamana-6rr7' } }, res);
    expect(redirects).toEqual(['http://localhost:5173/verify-email?token=wait-1&via=google']);
    expect(auth.createOAuthExchangeCode).not.toHaveBeenCalled();
  });
});
