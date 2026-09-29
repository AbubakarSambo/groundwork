import { readSuggestionThresholds, thresholdFor, DEFAULT_SUGGESTION_THRESHOLDS } from './thresholds';

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
