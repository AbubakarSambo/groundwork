import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { thisSuiteIsOff, AN_ADMIN_SWITCHES_IT_ON } from './a-suite-that-is-off-says-what-to-do';

/**
 * A SUITE THAT IS OFF SAYS WHAT TO DO ABOUT IT (screens request 154, item 8).
 *
 * Eleven suites refused with a bare statement and nothing a reader could act on - "The spending
 * suite is not switched on." - so the screens were adding a next step of their own. Two of them
 * already said one in chat. Now they all do, in the same words.
 */
describe('every suite that is off says what to do about it', () => {
  it('reads as one plain sentence followed by the next step', () => {
    expect(thisSuiteIsOff('The spending suite')).toBe('The spending suite is not switched on. An admin switches it on under Suites.');
  });

  it('does not double the full stop when the name already carries one', () => {
    expect(thisSuiteIsOff('The leave suite.')).toBe('The leave suite is not switched on. An admin switches it on under Suites.');
  });

  it('tells an admin where to go and everybody else who to ask, in one sentence', () => {
    expect(AN_ADMIN_SWITCHES_IT_ON).toBe('An admin switches it on under Suites.');
  });

  /*
   * THE REAL CHECK: no suite is left behind. A new suite copying the old bare wording is exactly
   * how ten of them came to say nothing useful, so this reads the services rather than a list.
   */
  it('no suite still refuses with a bare statement', () => {
    const dir = __dirname;
    const bare: string[] = [];
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.service.ts'))) {
      const src = readFileSync(join(dir, f), 'utf8');
      for (const m of src.matchAll(/notOn:\s*'([^']*is not switched on[^']*)'/g)) {
        if (!m[1].includes('An admin switches it on')) bare.push(`${f}: ${m[1]}`);
      }
    }
    expect(bare).toEqual([]);
  });
});
