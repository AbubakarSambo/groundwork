import { aLetterFor } from './party-labels';

/**
 * A CONVENING OF FORTY COULD NOT OPEN ITS FIRST CHECK-IN.
 *
 *   Party label collision on this ground: "Participant a" resolves to both ... and ...
 *
 * The label was `String.fromCharCode(65 + n)` - A to Z, and then whatever ASCII has after Z. The
 * twenty-seventh person was "Participant [". The thirty-third was "Participant a", which collides
 * with "Participant A" once the guard lowercases both, so the guard threw and the ground lost
 * everything built on labels. A 500 on the first request anybody made.
 *
 * The guard was right to throw: serving one person another's rows is the failure it exists to
 * prevent, and it caught this. What was wrong is that the labels ran out at twenty-six.
 *
 * Three people never find this. Forty find it before anybody speaks.
 */
describe('the alphabet runs out', () => {
  it('the first twenty-six are what they always were', () => {
    /* Labels are written into stored report JSON. Changing these would strand every report that
       already quotes them. */
    expect(aLetterFor(0)).toBe('A');
    expect(aLetterFor(1)).toBe('B');
    expect(aLetterFor(25)).toBe('Z');
  });

  it('and the twenty-seventh is AA, not a bracket', () => {
    expect(aLetterFor(26)).toBe('AA');
    expect(aLetterFor(27)).toBe('AB');
    expect(aLetterFor(51)).toBe('AZ');
    expect(aLetterFor(52)).toBe('BA');
  });

  it('nothing outside A to Z ever appears', () => {
    for (let i = 0; i < 500; i += 1) expect(aLetterFor(i)).toMatch(/^[A-Z]+$/);
  });

  it('and five hundred people have five hundred different labels, case-insensitively', () => {
    /* Case-insensitively is the point: "a" and "A" were two labels to the generator and one to the
       guard, which is exactly how the collision happened. */
    const seen = new Set<string>();
    for (let i = 0; i < 500; i += 1) {
      const label = aLetterFor(i).toLowerCase();
      expect(seen.has(label)).toBe(false);
      seen.add(label);
    }
  });
});
