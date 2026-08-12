import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A LINK THAT FAILED SAYS WHAT TO DO ABOUT IT. W8-62.
 *
 * `consumeToken` guards every password and verification link, and its messages are
 * rendered verbatim to whoever clicked one. They were 'Invalid token', 'This token has
 * already been used' and 'Invalid token type' - three descriptions of a database row,
 * under a password field, with no next move.
 *
 * Checked as text rather than by calling the method, for the same reason as
 * `between-session-notes.ts`: the wording IS the fix, and a mock that returns null
 * proves the branch runs, not that what it says is any use.
 */
const SRC = readFileSync(join(__dirname, 'auth.service.ts'), 'utf8');

/** The body of consumeToken, so a message elsewhere in the file cannot stand in for it. */
const WHOLE = SRC.slice(
  SRC.indexOf('private async consumeToken'),
  SRC.indexOf('async updateProfile'),
);

/**
 * Comments stripped. The comment inside `consumeToken` explains what the old wording
 * was, and quoting 'Invalid token' to say it is gone made the check below fail on the
 * very explanation of the fix. A rule that punishes writing down the reason is a rule
 * that gets the reason deleted.
 */
const CONSUME = WHOLE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('the messages a failed link produces', () => {
  it('found consumeToken at all', () => {
    // The slice above is the whole basis of this file.
    expect(CONSUME).toContain('emailVerificationToken');
    // And the stripping did not eat the code with the comments.
    expect(CONSUME).not.toContain('THESE STRINGS ARE READ BY A PERSON');
    expect(CONSUME.length).toBeGreaterThan(400);
  });

  it('none of them is an engineer describing a row', () => {
    for (const jargon of ['Invalid token', 'Invalid token type', 'has already been used;']) {
      expect(CONSUME).not.toContain(`'${jargon}'`);
    }
  });

  it('an unrecognised link says links expire, and where to get another', () => {
    expect(CONSUME).toMatch(/single use and they expire/);
    expect(CONSUME).toMatch(/sign-in page/);
  });

  it('an already-used one gets the different instruction, because it is a different situation', () => {
    /**
     * The one case worth telling apart: they already set a password. "Ask for a new
     * link" would send them round a loop; "sign in" is the thing that works.
     */
    expect(CONSUME).toMatch(/your password is set/);
    expect(CONSUME).toMatch(/Forgot your password/);
  });

  it('and the expired case still uses the caller\'s own wording', () => {
    // Each caller knows what its link was for, so it keeps saying so.
    expect(CONSUME).toContain('opts.allowExpiredMessage');
  });
});
