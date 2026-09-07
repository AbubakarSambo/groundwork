/**
 * THE UNSUBSCRIBE LINK ON EVERY ROUND DIGEST WENT TO THE NOT-FOUND PAGE.
 *
 * The API route was real and worked. The link was built against the FRONT END
 * (`${frontendUrl}/unsubscribe/:token`) and the React router had no such route, so it fell through
 * to `<Route path="*">`. Somebody who wanted the mail to stop pressed the only control we gave
 * them, was told "nothing's here", and kept receiving it.
 *
 * The unsubscribe controller's own comment explains why it accepts a GET: "a link that fails at
 * that moment becomes a spam complaint rather than a support ticket - which costs the whole
 * organisation's mail, not this one." The link failed anyway, one layer further out.
 *
 * So this checks the pairing rather than either half: every path we put in a mail that points at
 * the app has a route in the app. It is a whole class - the Connect page's `/api/docs` was the
 * same mistake in the other direction (see client/src/lib/where-the-api-lives.ts).
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const CLIENT = join(__dirname, '../../../../client/src/App.tsx');
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\}|\/\/[^\n]*/g, '');

/** Paths we build against the app's own origin and put in front of a reader. */
const LINKS_IN_MAIL = [
  { path: '/unsubscribe/:token', builtIn: 'round-digest.service.ts', pattern: /\/unsubscribe\/\$\{/ },
  { path: '/stop-reminders/:token', builtIn: 'email.service.ts', pattern: /\/stop-reminders\/\$\{/ },
];

describe('a link on a mail', () => {
  const app = strip(readFileSync(CLIENT, 'utf8'));

  for (const link of LINKS_IN_MAIL) {
    it(`${link.path} is still built the way this test assumes`, () => {
      /* If the builder stops emitting it, this file is testing a link nobody sends and the pairing
         below is meaningless. Fail loudly rather than pass vacuously. */
      const source = readFileSync(join(__dirname, link.builtIn), 'utf8');
      expect(source).toMatch(link.pattern);
    });

    it(`${link.path} has a route in the app, so it does not draw the not-found page`, () => {
      expect(app).toContain(`path="${link.path}"`);
    });
  }

  it('and the catch-all is still last, which is why a missing route was silent', () => {
    expect(app.indexOf('path="*"')).toBeGreaterThan(app.indexOf('path="/unsubscribe/:token"'));
  });
});
