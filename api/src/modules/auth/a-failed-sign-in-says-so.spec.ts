import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A GOOGLE SIGN-IN THAT FAILS HAS TO SAY SO, AND HAS TO LEAVE A TRACE.
 *
 * Reported as "I cannot even log in with Google". Driven from outside, every part of the flow was
 * healthy: the button reached the API, the API redirected to Google with the right callback
 * address, Google accepted the app, and the callback route was alive. The failure was after that,
 * and nothing anywhere said what it was, because of two lines.
 *
 * The catch was `catch { ... }` with no binding and no log, so the server kept no record of why.
 * And the redirect went to `/login?error=google_auth_failed`, where `/login` is a route that
 * renders `<Navigate to="/auth" replace />` - which drops the query string. So the reason never
 * reached the page either, and the person landed on an ordinary sign-in form as though the button
 * had done nothing.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const CONTROLLER = strip(readFileSync(join(__dirname, 'auth.controller.ts'), 'utf8'));
const APP = strip(readFileSync(join(__dirname, '..', '..', '..', '..', 'client', 'src', 'App.tsx'), 'utf8'));
const AUTH_PAGE = strip(
  readFileSync(join(__dirname, '..', '..', '..', '..', 'client', 'src', 'pages', 'auth', 'AuthPage.tsx'), 'utf8'),
);

describe('a failed Google sign-in is not silent', () => {
  it('the callback binds the error and logs it', () => {
    expect(CONTROLLER).not.toMatch(/\}\s*catch\s*\{\s*return res\.redirect/);
    expect(CONTROLLER).toMatch(/catch \(err: any\)/);
    expect(CONTROLLER).toMatch(/this\.logger\.error\(`Google sign-in failed/);
  });

  it('and sends the reason somewhere the page will still have it', () => {
    /* Not /login: that route drops the query string on its way to /auth. */
    expect(CONTROLLER).not.toContain('/login?error=google_auth_failed');
    expect(CONTROLLER).toContain('/auth?why=google-signin-failed');
  });

  it('the /login route stops discarding the query string', () => {
    expect(APP).not.toMatch(/path="\/login" element=\{<Navigate to="\/auth" replace \/>\}/);
    expect(APP).toContain('<KeepTheQuery to="/auth" />');
  });

  it('and the sign-in page has a sentence for it', () => {
    expect(AUTH_PAGE).toContain("searchParams.get('why') === 'google-signin-failed'");
    expect(AUTH_PAGE).toMatch(/could not finish signing you in/);
  });
});
