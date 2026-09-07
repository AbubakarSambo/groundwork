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

/**
 * EVERY app path our mail carries, found rather than listed.
 *
 * This file used to name two links. Two is what the last two bugs happened to be about, and a
 * hand-kept list of the links worth checking is a list that stops being complete the first time
 * somebody adds a mail - which is precisely how the unsubscribe link came to point at nothing.
 * There are fourteen, and they are read out of the senders themselves.
 */
const MAIL_BUILDERS = [
  'email.service.ts',
  'round-digest.service.ts',
  '../participants/participants.service.ts',
  '../conversation/remind.service.ts',
];

/**
 * `${this.frontendUrl}/checkin/${id}` -> `/checkin/`, `${this.frontendUrl}/org/members` ->
 * `/org/members`. The WHOLE literal path, with a trailing slash kept where an id follows.
 *
 * The first version of this took only the first segment, and a bite-check caught it: pointing the
 * waiting notice at `/org/nowhere-at-all` still passed, because it collapsed to `/org` and some
 * `/org/*` route exists. A guard that cannot fail on the exact bug it was written for is not a
 * guard, so it matches the full path now.
 */
function appPathsIn(source: string): string[] {
  const stripped = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
  const found = new Set<string>();
  for (const m of stripped.matchAll(/\$\{(?:this\.frontendUrl|this\.appUrl\(\))[^}]*\}(\/[A-Za-z0-9/_-]*)/g)) {
    if (m[1] !== '/') found.add(m[1]);
  }
  return [...found];
}

const PATHS_IN_MAIL = MAIL_BUILDERS.flatMap((rel) => {
  let source = '';
  try {
    source = readFileSync(join(__dirname, rel), 'utf8');
  } catch {
    return [];
  }
  return appPathsIn(source).map((path) => ({ path, builtIn: rel }));
});

describe('a link on a mail', () => {
  const app = strip(readFileSync(CLIENT, 'utf8'));

  it('found the links, or this test proves nothing', () => {
    /* Fourteen when this was written. A floor rather than the exact number, so adding a mail does
       not fail this - but deleting the scan's own regex does. */
    expect(PATHS_IN_MAIL.length).toBeGreaterThanOrEqual(10);
  });

  for (const { path, builtIn } of PATHS_IN_MAIL) {
    it(`${path} (in ${builtIn}) has a route in the app`, () => {
      /**
       * The failure this catches, twice over: the unsubscribe link on every round digest was built
       * against the front end and the app had no such route, so it drew the not-found page - and my
       * own waiting-list notice went out pointing at /org/people when the route is /org/members.
       *
       * Matched on the first segment because that is what React Router matches: `/checkin/:id` in
       * the app answers `/checkin/<uuid>` in a mail.
       */
      /* A path ending in a slash is followed by an id or a token in the mail, so the app's route
         for it carries a parameter there: `/checkin/` in a mail is `/checkin/:id` in the app. */
      const expected = path.endsWith('/') ? `path="${path}:` : `path="${path}"`;
      expect(app).toContain(expected);
    });
  }

  it('and the catch-all is still last, which is why a missing route was silent', () => {
    expect(app.indexOf('path="*"')).toBeGreaterThan(app.indexOf('path="/unsubscribe/:token"'));
  });

  /* The marketing-side doors are checked where the marketing tree is already read - see
     client/src/pages/grounds/every-route-has-a-door.spec.ts. Two files asserting it is two files
     to keep agreeing. */
});
