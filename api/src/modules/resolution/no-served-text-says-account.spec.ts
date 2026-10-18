import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE WORD "ACCOUNT" IS NOT IN TEXT THE ENGINE SERVES (final check of the anchor, 8 October). A person's words are called what they said, and a
 * sign-in is called a sign-in. Each of these was read by a person: a line on the ending page, the answer to a correction, a reminder mail, the
 * refusal in a person's own export and the refusal when a check-in could not be opened in their name.
 */
const withoutComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const read = (p: string) => withoutComments(readFileSync(join(__dirname, '..', p), 'utf8'));

describe('text the engine serves does not say "account"', () => {
  it('the ending page says what you said, not your account', () => {
    const s = read('resolution/resolution.service.ts');
    expect(s).toContain('What you said and your corrections stand on the record beside theirs.');
    expect(s).not.toContain('Your account and your corrections');
  });
  it('a correction is noted with what you said', () => {
    const s = read('alignment/alignment.service.ts');
    expect(s).toContain('Noted, and it stays on the record with what you said.');
    expect(s).not.toContain('with your account of it');
  });
  it('the reminder mail invites you to say what you see', () => {
    const s = read('email/email.service.ts');
    expect(s).toContain('You were invited to say what you see in <strong>');
    expect(s).not.toContain('give your account of');
  });
  it('a sign-in that is not linked is called a sign-in', () => {
    expect(read('people/my-own-record.service.ts')).toContain('Your sign-in is not linked to a directory record here');
    expect(read('assistant/assistant.service.ts')).toContain('because your sign-in is not linked to a person here yet');
  });
});
