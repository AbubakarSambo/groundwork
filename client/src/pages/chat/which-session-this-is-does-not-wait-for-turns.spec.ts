import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * "SESSION 1" ON A PAGE OPENING WITH WHAT THEY SAID LAST TIME.
 *
 * Walked in a browser as a participant whose session 2 had just opened. The header under her name
 * said Session 1, the composer bar said Session 1, and the first line on the screen was "Last time
 * you told us you'd confirm the supermarket chain with Sahar next week."
 *
 * The cause is the one the comment beside `brief` already describes: the session number was read
 * from the check-in only inside `if (t.turns.length > 0)`, and a session nobody has answered yet
 * has no turns. So the page fell back to the number carried in navigation state, which is 1.
 *
 * Pinned in source because the fault is WHERE the line sits, not what it does.
 */
const SRC = readFileSync(join(__dirname, 'ChatPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('which session this is does not wait for turns', () => {
  it('reads the session number from the check-in before the turns are looked at', () => {
    const reads = SRC.indexOf('setSessionNumber(t.checkIn.sessionNumber)');
    const turns = SRC.indexOf('if (t.turns && t.turns.length > 0)');
    expect(reads).toBeGreaterThan(-1);
    expect(turns).toBeGreaterThan(-1);
    expect(reads).toBeLessThan(turns);
  });

  it('and so does the ground it belongs to, which had the same shape', () => {
    const reads = SRC.indexOf('setGroundId(t.checkIn.groundId)');
    expect(reads).toBeLessThan(SRC.indexOf('if (t.turns && t.turns.length > 0)'));
  });
});
