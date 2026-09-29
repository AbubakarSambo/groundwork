import { readSuggestionThresholds, thresholdFor, DEFAULT_SUGGESTION_THRESHOLDS, isValidSuggestionThresholds } from './thresholds';

/**
 * THE THRESHOLDS FOR A SUGGESTION (decision 33, decision 53). Nothing is set by default, and a
 * threshold that is not a proper `{ keptBelow, overPeriods }` pair is read as nothing set, never
 * guessed at - a bad row must never reach a suggestion nobody asked for.
 */
describe('reading suggestion thresholds', () => {
  it('starts empty: nothing is set until Hafsah sets it (decision 33)', () => {
    expect(DEFAULT_SUGGESTION_THRESHOLDS).toEqual({});
    expect(readSuggestionThresholds(null)).toEqual({});
    expect(readSuggestionThresholds(undefined)).toEqual({});
    expect(thresholdFor({}, 'support')).toBeNull();
  });

  it('reads a threshold set for one verdict, and leaves the rest unset', () => {
    const stored = { support: { keptBelow: 0.6, overPeriods: 4 } };
    const out = readSuggestionThresholds(stored);
    expect(out).toEqual({ support: { keptBelow: 0.6, overPeriods: 4 } });
    expect(thresholdFor(out, 'support')).toEqual({ keptBelow: 0.6, overPeriods: 4 });
    expect(thresholdFor(out, 'plan')).toBeNull();
  });

  it('drops a malformed threshold rather than guessing at it', () => {
    expect(readSuggestionThresholds({ support: { keptBelow: 'low', overPeriods: 4 } })).toEqual({});
    expect(readSuggestionThresholds({ support: { keptBelow: 0.6 } })).toEqual({});
    expect(readSuggestionThresholds({ support: { keptBelow: 0, overPeriods: 4 } })).toEqual({});
    expect(readSuggestionThresholds({ support: { keptBelow: 1.4, overPeriods: 4 } })).toEqual({});
    expect(readSuggestionThresholds({ support: { keptBelow: 0.6, overPeriods: 0 } })).toEqual({});
    expect(readSuggestionThresholds({ exit: 'soon' })).toEqual({});
    expect(readSuggestionThresholds('not an object')).toEqual({});
  });
});

/**
 * The admin write path (week 10): where reading is forgiving, writing is not - the admin route
 * refuses anything that is not the documented shape rather than silently dropping it.
 */
describe('validating suggestion thresholds before they are written', () => {
  it('accepts the empty set, and a properly-shaped threshold for one or more verdicts', () => {
    expect(isValidSuggestionThresholds({})).toBe(true);
    expect(isValidSuggestionThresholds({ support: { keptBelow: 0.6, overPeriods: 4 } })).toBe(true);
    expect(
      isValidSuggestionThresholds({
        support: { keptBelow: 0.6, overPeriods: 4 },
        exit: { keptBelow: 0.3, overPeriods: 6 },
      }),
    ).toBe(true);
  });

  it('refuses a key that is not one of the five verdicts', () => {
    expect(isValidSuggestionThresholds({ retire: { keptBelow: 0.6, overPeriods: 4 } })).toBe(false);
  });

  it('refuses a threshold missing a field, or out of range', () => {
    expect(isValidSuggestionThresholds({ support: { keptBelow: 0.6 } })).toBe(false);
    expect(isValidSuggestionThresholds({ support: { keptBelow: 0, overPeriods: 4 } })).toBe(false);
    expect(isValidSuggestionThresholds({ support: { keptBelow: 1.4, overPeriods: 4 } })).toBe(false);
    expect(isValidSuggestionThresholds({ support: { keptBelow: 0.6, overPeriods: 0 } })).toBe(false);
    expect(isValidSuggestionThresholds({ support: { keptBelow: 0.6, overPeriods: 1.5 } })).toBe(false);
  });

  it('refuses anything that is not a plain object', () => {
    expect(isValidSuggestionThresholds(null)).toBe(false);
    expect(isValidSuggestionThresholds('not an object')).toBe(false);
    expect(isValidSuggestionThresholds([{ keptBelow: 0.6, overPeriods: 4 }])).toBe(false);
  });
});
