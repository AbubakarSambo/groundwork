import { aSuggestionFromTheRecord } from './a-suggestion-reached-from-the-record';
import { A_LABEL_ON_A_PERSON } from './a-suggestion-told-like-a-signal';

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
