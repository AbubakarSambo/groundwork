/**
 * A CODE THAT CANNOT BE GUESSED AND CANNOT BE HAMMERED.
 *
 * Both one-time codes were `Math.floor(100000 + Math.random() * 900000)`. Math.random is a fast
 * PRNG seeded from process state, not a source of secrets - its stream is recoverable from enough
 * output. These six digits are the whole of the second factor in front of the back office and the
 * platform console.
 *
 * And nothing counted wrong guesses. A million possibilities, a code that stayed live for its full
 * ten minutes however often it was missed, and the only real barrier was how fast guesses could be
 * posted - by somebody who already holds a session on a staff account, which is the case this
 * factor exists for.
 *
 * Held as source order because both defects are the ABSENCE of something, which a happy-path test
 * cannot see.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { GUESSES_ALLOWED } from './the-back-office-has-a-door';

const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const read = (...p: string[]) => strip(readFileSync(join(__dirname, '..', ...p), 'utf8'));

const DOOR = read('back-office', 'back-office-door.service.ts');
const ADMIN = read('admin', 'admin.service.ts');

describe('the codes themselves', () => {
  it.each([
    ['the back office door', DOOR],
    ['the platform console', ADMIN],
  ])('%s draws from the CSPRNG, never Math.random', (_name, code) => {
    expect(code).toMatch(/crypto\.randomInt\(100000, 1000000\)/);
    expect(code).not.toMatch(/Math\.random/);
  });

  it('and six digits is still six digits - the range is the whole of it, ends included', () => {
    /** randomInt is [min, max), so 1000000 is the exclusive bound that keeps 999999 reachable. */
    expect(DOOR).toMatch(/randomInt\(100000, 1000000\)/);
  });
});

describe('guessing at the door', () => {
  const verify = DOOR.slice(DOOR.indexOf('async verify('), DOOR.indexOf('private async forgetTheCode'));

  it('counts a wrong guess', () => {
    expect(verify).toMatch(/wrongGuesses: \{ increment: 1 \}/);
  });

  it('destroys the code once there have been enough of them', () => {
    expect(verify).toMatch(/wrongGuesses >= GUESSES_ALLOWED/);
    expect(verify).toMatch(/forgetTheCode\(userId\)/);
    expect(GUESSES_ALLOWED).toBe(5);
  });

  it('refuses somebody whose staff grant went away while the code was in flight', () => {
    expect(verify).toMatch(/isStaff\(userId\)/);
  });

  it('and a new code clears the count, so asking again is the way out', () => {
    const send = DOOR.slice(DOOR.indexOf('async sendCode('), DOOR.indexOf('async verify('));
    expect(send).toMatch(/wrongGuesses: 0/);
  });
});
