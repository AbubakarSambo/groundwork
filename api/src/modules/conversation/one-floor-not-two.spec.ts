import { readFileSync } from 'fs';
import { join } from 'path';
import { theFloorFor, A_CHECK_IN_IS_NOT_DONE_IN, A_CORRECTION_IS_NOT_DONE_IN } from './how-short-a-check-in-may-be';

/**
 * THE ENGINE AND THE SERVER READ THE SAME FLOOR.
 *
 * When they disagree it is a deadlock, not friction: the engine offers the close, the client
 * disables the composer because the session is over, the person presses finish, and the server
 * refuses for being one turn short with no way left to add one. That has happened on live runs.
 *
 * The number was written out twice. It is a constant now, and this fails if anybody inlines it
 * again.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const SRC = strip(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));

describe('one floor, read in both places', () => {
  it('the service never inlines the turn floor again', () => {
    /* Narrow to the variable this file owns. `MIN_CHARS` and `MIN_REAL_TURNS` next to it are
       different rules - how much somebody has to have written, and how many turns count as real -
       and both still apply on top of this one. */
    expect(SRC).not.toMatch(/minTurns\s*=\s*[^;]*\?\s*\d+\s*:\s*\d+/);
  });

  it('both places read it from the one module', () => {
    expect([...SRC.matchAll(/theFloorFor\(/g)]).toHaveLength(2);
  });

  it('a check-in does not close on three answers any more', () => {
    /* Read live: a session offered to finish after three, on a product that says ten minutes. */
    expect(A_CHECK_IN_IS_NOT_DONE_IN).toBeGreaterThan(3);
    expect(theFloorFor(false)).toBe(A_CHECK_IN_IS_NOT_DONE_IN);
  });

  it('and a correction still takes one, because it is one thing', () => {
    expect(theFloorFor(true)).toBe(A_CORRECTION_IS_NOT_DONE_IN);
    expect(A_CORRECTION_IS_NOT_DONE_IN).toBe(1);
  });
});
