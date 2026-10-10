/**
 * The sign-in form gave five answers and four were facts about a stranger's address: registered,
 * unverified, signs in with Google, has never set a password. Anybody could type addresses in and
 * learn which of them work here — and the last of those is the most useful to somebody choosing a
 * target. Found by probing the running product.
 */
import * as fs from 'fs';
import * as path from 'path';
import { THE_SAME_ANSWER_EITHER_WAY } from './one-answer-at-the-door';

describe('the one answer', () => {
  /* 10 October 2026 (communications check): it used to say "We have emailed you a sign-in link, if we know that address", which was false for a wrong password and
     for an unknown address, where nothing is sent. It now says only what is true in every branch. */
  it('is true whichever branch produced it: it says nothing was emailed', () => {
    expect(THE_SAME_ANSWER_EITHER_WAY).not.toMatch(/emailed you/i);
    expect(THE_SAME_ANSWER_EITHER_WAY).toMatch(/did not work/i);
  });

  it('is actionable for somebody who does have a password', () => {
    expect(THE_SAME_ANSWER_EITHER_WAY).toMatch(/check them and try again/i);
  });

  it('and for somebody who does not', () => {
    expect(THE_SAME_ANSWER_EITHER_WAY).toMatch(/ask for a sign-in link or a password reset/);
  });

  it('reveals nothing about the account', () => {
    for (const leak of [/Google/i, /deactivated/i, /not verified/i, /no password/i, /does not exist/i]) {
      expect(THE_SAME_ANSWER_EITHER_WAY).not.toMatch(leak);
    }
  });
});

describe('and the sign-in path gives no other answer', () => {
  const src = fs
    .readFileSync(path.join(__dirname, 'auth.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  /**
   * login() only — other methods legitimately say more to somebody already signed in.
   *
   * Bounded by the NEXT method after it rather than by a name guessed from elsewhere in the file:
   * `registerMagicLink` sits BEFORE login, so slicing to it produced an empty string and every
   * assertion below passed against nothing. Caught by the length check, which is why it is here.
   */
  const from = src.indexOf('async login(');
  const login = src.slice(from, src.indexOf('\n  async ', from + 10));

  it('found the method, so this cannot pass by reading nothing', () => {
    expect(login.length).toBeGreaterThan(400);
  });

  it('names none of the five old sentences', () => {
    for (const said of [
      'Invalid email or password',
      'Account is deactivated',
      'Please verify your email before logging in',
      'uses Google Sign-In',
      "emailed you a link to set your password",
    ]) {
      expect(login).not.toContain(said);
    }
  });

  it('refuses through the one helper, on every branch', () => {
    /* No account, deactivated, unverified, Google-without-password, no-password, wrong password. */
    expect((login.match(/refuse\('/g) ?? []).length).toBe(6);
  });

  it('and still records the real reason for us', () => {
    expect(login).toMatch(/Sign-in refused for .* \$\{why\}/);
  });

  it('and still sends the setup mail, because that behaviour was the good part', () => {
    expect(login).toContain('sendAddPasswordEmail');
  });
});

describe('the one answer is written the way a person reads', () => {
  it('in full sentences, with nothing joined by a dash', () => {
    expect(THE_SAME_ANSWER_EITHER_WAY).toBe(
      /* Reworded on 5 October (request 141) so the point comes first and the copy guard counts one line fewer. */
      'That address and password did not work. Check them and try again, or ask for a sign-in link or a password reset from this page.',
    );
    expect(THE_SAME_ANSWER_EITHER_WAY).not.toMatch(/ - /);
  });
});
