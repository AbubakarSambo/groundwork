/**
 * A contributor whose company goes live must not stop counting.
 *
 * The qualifying line is a setting, so the code that applies it sees a status
 * and a line and has to decide. Written as `status === line`, a company that
 * reaches QUALIFIED silently drops out of a READY-line count — the contributor
 * is punished for the introduction working, and the number goes DOWN on the
 * best possible day. Written as a threshold it cannot.
 */
import { countsTowardTarget } from './what-counts-toward-a-target';

describe('an introduction counts once it has reached the line', () => {
  it('counts at the line', () => {
    expect(countsTowardTarget('READY', 'READY')).toBe(true);
  });

  it('and still counts past it, which is the whole point', () => {
    expect(countsTowardTarget('QUALIFIED', 'READY')).toBe(true);
  });

  it('but not before it', () => {
    expect(countsTowardTarget('INTRODUCED', 'READY')).toBe(false);
  });

  it('and every status counts when the line is the first one', () => {
    for (const status of ['INTRODUCED', 'READY', 'QUALIFIED'] as const) {
      expect(countsTowardTarget(status, 'INTRODUCED')).toBe(true);
    }
  });

  it('and only the last counts when the line is the last one', () => {
    expect(countsTowardTarget('QUALIFIED', 'QUALIFIED')).toBe(true);
    expect(countsTowardTarget('READY', 'QUALIFIED')).toBe(false);
  });
});
