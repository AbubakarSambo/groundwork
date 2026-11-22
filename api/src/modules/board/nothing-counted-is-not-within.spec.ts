import { whereThisTargetStands } from './the-headline-and-where-each-target-stands';

/**
 * RE-TEST, 22 NOVEMBER 2026 EVENING (R-12). A new distribution board read "The team makes all deliveries within 2 days. 0 of ≤ 2. Within" and
 * "The team keeps the cost per drop under 850. 0 of ≤ 850. Within": nothing had been measured, and the stored 0 was read as a count that
 * keeps both limits. With no count kept at any check-in and none read from a record, the board says nothing has been counted.
 */
const t = (over: Record<string, unknown>) => ({ id: 'o1', target: 2, count: 0, start: null, direction: 'LIMIT', journeyDirection: 'unknown', notSettled: null, ...over } as any);
const NOTHING = { word: null, says: 'Nothing has been counted against this yet, so how it stands cannot be said.' };

describe('a target with nothing counted against it says so', () => {
  it('a limit, a count to keep at zero, a rate and an aim', () => {
    expect(whereThisTargetStands(t({}), [], 12)).toEqual(NOTHING);
    expect(whereThisTargetStands(t({ target: 850 }), [], 12)).toEqual(NOTHING);
    expect(whereThisTargetStands(t({ direction: 'ZERO', target: 0 }), [], 12)).toEqual(NOTHING);
    expect(whereThisTargetStands(t({ direction: 'RATE', target: 95 }), [], 12)).toEqual(NOTHING);
    expect(whereThisTargetStands(t({ direction: 'AIM', target: 50 }), [], 12)).toEqual(NOTHING);
  });
  it('a 0 that was counted is a count', () => {
    expect(whereThisTargetStands(t({}), [{ sessionNumber: 1, count: 0 }], 12)?.word).toBe('Within');
    expect(whereThisTargetStands(t({ countedFromARecord: true }), [], 12)?.word).toBe('Within');
    expect(whereThisTargetStands(t({ count: 3 }), [], 12)).toEqual({ word: 'Over limit', says: 'It is 3, which is over the limit of 2.' });
  });
});
