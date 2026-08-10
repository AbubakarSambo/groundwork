import { canSignIn } from './can-sign-in';

/**
 * A LEAD MUST BE ABLE TO OPEN THE INVITATION THAT NAMES THEM.
 *
 * Found live, on ground 2 of the eighteen. Sahar set up the Atlas ground and
 * named Kennedy to lead it. He got the email. It took him to /grounds/:id, which
 * is behind auth, so he landed on a sign-in form asking for a password he had
 * never had - and there is no way out of that screen for him. "Forgot your
 * password?" is wrong because he never had one, and the only working escape is
 * headed "New here?", which he has no reason to read.
 *
 * A ground had been created that could never be led.
 *
 * THE CAUSE WAS ASKING THE WRONG QUESTION. The code branched on whether the user
 * row had just been created, and sent a password-setup link only in that case.
 * But a row can exist for somebody who has never signed in - added to a ground
 * and never accepted, invited to the organisation, or, as here, left behind when
 * an earlier attempt failed after creating them. All of those get treated as
 * established.
 *
 * The question that matters is whether they hold a credential, so that is the
 * question now asked. The cases below are the ways the two answers come apart.
 */

describe('who needs a way in', () => {
  it('a brand new person has none', () => {
    expect(canSignIn({ passwordHash: null, googleId: null })).toBe(false);
  });

  it('someone who set a password has one', () => {
    expect(canSignIn({ passwordHash: '$2b$10$abc', googleId: null })).toBe(true);
  });

  it('someone who came in through Google has one, with no password anywhere', () => {
    expect(canSignIn({ passwordHash: null, googleId: '11480' })).toBe(true);
  });
});

describe('the cases the old question got wrong', () => {
  /**
   * Each of these is a real user row belonging to somebody who cannot sign in.
   * The old test - "was this row created just now" - answered no for every one
   * of them, and every one of them was sent to a locked page.
   */
  it('KENNEDY. Left behind by a failed attempt, then invited again', () => {
    // The exact live failure. His row was written outside the transaction, the
    // ground rolled back, and the retry found an existing user.
    const kennedy = { passwordHash: null, googleId: null };
    expect(canSignIn(kennedy)).toBe(false);
  });

  it('somebody added to a ground months ago who never accepted', () => {
    expect(canSignIn({ passwordHash: null, googleId: null })).toBe(false);
  });

  it('an empty string is not a credential, however much it looks like a field', () => {
    // Worth pinning rather than assuming. A blank hash is what a half-finished
    // write leaves behind, and truthiness is the only thing standing between
    // that and a locked door.
    expect(canSignIn({ passwordHash: '', googleId: '' })).toBe(false);
  });

  it('no user at all is not a person who can sign in', () => {
    expect(canSignIn(null)).toBe(false);
    expect(canSignIn(undefined)).toBe(false);
  });
});

describe('this test can fail', () => {
  /**
   * The check that made the difference on four earlier guards in this codebase,
   * every one of which passed against the bug it claimed to prevent.
   *
   * Written out rather than trusted: the old rule, applied to Kennedy, and the
   * assertion that it gives the wrong answer. If someone reinstates it, the
   * suite says so here rather than in a support ticket.
   */
  it('the question it replaced would have stranded Kennedy', () => {
    const rowExistedAlready = true;
    const oldAnswer = !rowExistedAlready;            // "is new user" -> send setup link
    const newAnswer = !canSignIn({ passwordHash: null, googleId: null });

    expect(oldAnswer).toBe(false);                   // the old rule sends him to a locked page
    expect(newAnswer).toBe(true);                    // the new rule sends him a way in
    expect(oldAnswer).not.toBe(newAnswer);
  });
});
