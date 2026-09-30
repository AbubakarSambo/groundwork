import { aSuggestionFromTheRecord } from './a-suggestion-reached-from-the-record';
import { A_LABEL_ON_A_PERSON } from './a-suggestion-told-like-a-signal';
import { DEFAULT_SUGGESTION_THRESHOLDS } from './thresholds';

/**
 * REACHING A SUGGESTION FROM THE RECORD (week 10). No threshold, no suggestion (decision 33). A
 * threshold that is crossed reaches "support", said in plain sentences, with a count for the
 * person alone and never a count in what the lead would read (decision 24, decision 53).
 */
const record = (over: Partial<Parameters<typeof aSuggestionFromTheRecord>[1]> = {}) => ({
  aboutParticipantId: 'p-tobi',
  aboutLabel: 'Tobi X',
  commitmentsSettledRecently: { kept: 2, of: 8 },
  ownWords: 'Most of my time has gone on the new customer records.',
  ...over,
});

describe('aSuggestionFromTheRecord', () => {
  it('reaches nothing when no threshold is set for any verdict (decision 33)', () => {
    expect(aSuggestionFromTheRecord('g-1', record(), {})).toBeNull();
  });

  it('reaches nothing when a threshold is set for a different verdict', () => {
    const thresholds = { plan: { keptBelow: 0.5, overPeriods: 4 } };
    expect(aSuggestionFromTheRecord('g-1', record(), thresholds)).toBeNull();
  });

  it('reaches nothing when there are not yet enough settled commitments (overPeriods)', () => {
    const thresholds = { support: { keptBelow: 0.6, overPeriods: 10 } };
    expect(aSuggestionFromTheRecord('g-1', record({ commitmentsSettledRecently: { kept: 2, of: 8 } }), thresholds)).toBeNull();
  });

  it('reaches nothing when the share kept is not below the threshold', () => {
    const thresholds = { support: { keptBelow: 0.6, overPeriods: 4 } };
    expect(aSuggestionFromTheRecord('g-1', record({ commitmentsSettledRecently: { kept: 6, of: 8 } }), thresholds)).toBeNull();
  });

  it('reaches nothing when there is no record of kept commitments at all', () => {
    const thresholds = { support: { keptBelow: 0.6, overPeriods: 4 } };
    expect(aSuggestionFromTheRecord('g-1', record({ commitmentsSettledRecently: null }), thresholds)).toBeNull();
  });

  it('reaches "support" once the threshold is crossed, with a count only for the person', () => {
    const thresholds = { support: { keptBelow: 0.6, overPeriods: 4 } };
    const s = aSuggestionFromTheRecord('g-1', record(), thresholds)!;
    expect(s).not.toBeNull();
    expect(s.groundId).toBe('g-1');
    expect(s.aboutParticipantId).toBe('p-tobi');
    expect(s.verdict).toBe('support');
    expect(s.headline).toBe('Groundwork suggests extra support for Tobi X');
    expect(s.theirOwnAnswer).toBe('Most of my time has gone on the new customer records.');

    /* The count stays the person's alone (decision 24 / week 9). */
    expect(s.factsForThem).toContain('kept 2 of 8');

    /* No count reaches what the lead would be given: no fraction, no "of", no digits at all. */
    for (const field of [s.headline, s.why, s.whatWouldChangeIt, s.ifYouAgree, ...(s.otherChoices ?? [])]) {
      expect(field).not.toMatch(/\d/);
    }
  });

  it('never puts a label on the person, in any field', () => {
    const thresholds = { support: { keptBelow: 0.6, overPeriods: 4 } };
    const s = aSuggestionFromTheRecord('g-1', record(), thresholds)!;
    for (const field of [s.headline, s.why, s.whatWouldChangeIt, s.factsForThem, s.whatWouldChangeItForThem]) {
      expect(A_LABEL_ON_A_PERSON.test(field ?? '')).toBe(false);
    }
  });
});

/**
 * DECISION 61 (30 September 2026): THE FIRST THRESHOLD FOR WEEK 10, checked against the actual
 * default (thresholds.ts, DEFAULT_SUGGESTION_THRESHOLDS) rather than a value made up for the test -
 * fewer than half kept, with at least 6 settled. Keep, reward, plan and exit reach nothing: the
 * default sets support alone. The lead's text still carries no count (decision 53 over decision 43).
 */
describe('decision 61: the first threshold, applied as the default actually reads', () => {
  it('reaches support at 5 kept of 12 (5/12 is 0.42, below 0.5, with 12 settled at or above 6)', () => {
    const s = aSuggestionFromTheRecord('g-1', record({ commitmentsSettledRecently: { kept: 5, of: 12 } }), DEFAULT_SUGGESTION_THRESHOLDS);
    expect(s).not.toBeNull();
    expect(s!.verdict).toBe('support');
  });

  it('reaches nothing at 3 kept of 5 settled: not enough settled commitments yet, whatever the share', () => {
    expect(aSuggestionFromTheRecord('g-1', record({ commitmentsSettledRecently: { kept: 3, of: 5 } }), DEFAULT_SUGGESTION_THRESHOLDS)).toBeNull();
  });

  it('reaches nothing at exactly 6 kept of 12: 0.5 is not below 0.5', () => {
    expect(aSuggestionFromTheRecord('g-1', record({ commitmentsSettledRecently: { kept: 6, of: 12 } }), DEFAULT_SUGGESTION_THRESHOLDS)).toBeNull();
  });

  it('keep, reward, plan and exit reach nothing: the default sets support alone', () => {
    expect(DEFAULT_SUGGESTION_THRESHOLDS).toEqual({ support: { keptBelow: 0.5, overPeriods: 6 } });
    for (const verdict of ['keep', 'reward', 'plan', 'exit'] as const) {
      expect(DEFAULT_SUGGESTION_THRESHOLDS[verdict]).toBeUndefined();
    }
  });

  it("the lead's text still carries no count, at the default threshold", () => {
    const s = aSuggestionFromTheRecord('g-1', record({ commitmentsSettledRecently: { kept: 5, of: 12 } }), DEFAULT_SUGGESTION_THRESHOLDS)!;
    for (const field of [s.headline, s.why, s.whatWouldChangeIt, s.ifYouAgree, ...(s.otherChoices ?? [])]) {
      expect(field).not.toMatch(/\d/);
    }
  });
});
