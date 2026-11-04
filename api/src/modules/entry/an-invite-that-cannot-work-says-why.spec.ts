import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * "YOU CAN RESEND FROM YOUR CHECK-IN PAGE" IS ADVICE THAT CANNOT WORK.
 *
 * Not for a bounced address - there it is exactly right. But the commonest reason an invite fails
 * out of the entry chat is the free plan's five people, counting the person setting it up, so an
 * admin who names five colleagues loses one and is told to try again at something that will refuse
 * them every time.
 *
 * `addParticipant` answers with a sentence written for a person. It was being reduced to an email
 * address one line after it arrived.
 *
 * Comments stripped: this explanation names the code it protects.
 */
const SRC = readFileSync(join(__dirname, 'entry.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, '');

const LOOP = SRC.slice(SRC.indexOf('const inviteResults:'), SRC.indexOf('Zero contributors'));

describe('an invite that failed says why', () => {
  it('finds the loop, so an empty slice cannot pass', () => {
    expect(LOOP.length).toBeGreaterThan(300);
  });

  it('keeps the reason the API gave, per person', () => {
    expect(LOOP).toContain('whyInvitesFailed.push({ email: c.email, because: err?.message');
  });

  it('never throws the reason away and keeps only the address', () => {
    /* The old behaviour: `failedInvites.push(c.email)` and nothing else. */
    const pushes = LOOP.match(/failedInvites\.push/g) ?? [];
    const reasons = LOOP.match(/whyInvitesFailed\.push/g) ?? [];
    expect(reasons.length).toBe(pushes.length);
  });

  it('sends it back to the screen', () => {
    /* UPDATED (Hafsah's blocker, 31 October 2026): the numbers the save could not keep are sent back beside the reasons. */
    expect(SRC).toContain('failedInvites, whyInvitesFailed, numbersNotKept }');
  });

  it('still returns the plain list, because something else filters on it', () => {
    /* MagicVerifyPage works out who WAS invited by excluding these. Dropping it would silently
       report everybody as invited. */
    expect(SRC).toContain('failedInvites.push(c.email)');
  });

  it('one failure never stops the others being invited', () => {
    expect(LOOP).toContain('try {');
    expect(LOOP).toContain('} catch (err: any) {');
  });
});
