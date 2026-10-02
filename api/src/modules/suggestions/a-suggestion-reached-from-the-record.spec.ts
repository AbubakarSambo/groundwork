import { aSuggestionFromTheRecord } from './a-suggestion-reached-from-the-record';
import { A_LABEL_ON_A_PERSON } from './a-suggestion-told-like-a-signal';
import { DEFAULT_SUGGESTION_THRESHOLDS } from './thresholds';
import { aShareInWords } from './a-suggestion-reached-from-the-record';

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

  it('reaches "support" once the threshold is crossed, with the count for the person and for the lead (decision 86)', () => {
    const thresholds = { support: { keptBelow: 0.6, overPeriods: 4 } };
    const s = aSuggestionFromTheRecord('g-1', record(), thresholds)!;
    expect(s).not.toBeNull();
    expect(s.groundId).toBe('g-1');
    expect(s.aboutParticipantId).toBe('p-tobi');
    expect(s.verdict).toBe('support');
    expect(s.headline).toBe('Groundwork suggests extra support for Tobi X');
    expect(s.theirOwnAnswer).toBe('Most of my time has gone on the new customer records.');

    /* The count stays the person's alone (decision 24 / week 9), in the You board's own words. */
    expect(s.factsForThem).toContain('you kept two of your eight commitments in this check-in.');

    /* Decision 86 reverses decision 53's "no count": the lead reads the count behind it, of this check-in only. */
    expect(s.why).toBe('In the last four weeks, Tobi X kept two of the eight commitments made in this check-in. That is 25%. When fewer than six in ten are kept, Groundwork suggests extra support.');
    expect(s.whatWouldChangeIt).toBe('If Tobi X keeps at least six in ten of the commitments made in this check-in over the next four weeks.');
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
 * default sets support alone. The lead's text carries the count behind it (decision 86 reverses decision 53).
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

  it("the lead's text carries the count, in figures above ten, at the default threshold (decision 86)", () => {
    const s = aSuggestionFromTheRecord('g-1', record({ commitmentsSettledRecently: { kept: 5, of: 12 } }), DEFAULT_SUGGESTION_THRESHOLDS)!;
    expect(s.why).toBe('In the last 4 weeks, Tobi X kept 5 of the 12 commitments made in this check-in. That is 42%. When fewer than half are kept, Groundwork suggests extra support.');
    for (const field of [s.headline, s.ifYouAgree, ...(s.otherChoices ?? [])]) {
      expect(field).not.toMatch(/\d/);
    }
  });
});

/**
 * WHAT EACH READER READS, AS FULL SENTENCES, at decision 61's threshold (1 October). The person's
 * facts used to read "In the last few check-ins, you kept 2 of 8 commitments. That is 25 in 100.
 * When fewer are kept than Groundwork looks for, Groundwork suggests extra support to your lead.":
 * "few check-ins" for a count that is four weeks, a share nobody asked for, and no line said. The
 * lead's why named nobody ("Commitments have been kept less often..."). Both now follow the
 * prototype's "Where you stand" (C3 what-daniel-sees.txt) and Daniel's board (suggestion-daniel.txt).
 */
describe('the sentences each reader is given, in the prototype\'s words', () => {
  const s = aSuggestionFromTheRecord('g-1', record({ leadLabel: 'Wairimu X', commitmentsSettledRecently: { kept: 2, of: 8 } }), DEFAULT_SUGGESTION_THRESHOLDS)!;

  it('the person reads their count, the line, and who it is suggested to, by name', () => {
    expect(s.factsForThem).toBe('In the last four weeks, you kept two of your eight commitments in this check-in. When fewer than half are kept, Groundwork suggests extra help to Wairimu X.');
    expect(s.whatWouldChangeItForThem).toBe('Keeping at least half of your commitments in this check-in over the next four weeks.');
  });

  it('the lead reads what happened, by name, with the count behind it (decision 86)', () => {
    expect(s.headline).toBe('Groundwork suggests extra support for Tobi X');
    expect(s.why).toBe('In the last four weeks, Tobi X kept two of the eight commitments made in this check-in. That is 25%. When fewer than half are kept, Groundwork suggests extra support.');
    expect(s.whatWouldChangeIt).toBe('If Tobi X keeps at least half of the commitments made in this check-in over the next four weeks.');
    expect(s.ifYouAgree).toBe('Extra support for Tobi X over the next four weeks, agreed with Tobi X.');
    expect(s.otherChoices).toEqual(['Keep things as they are', 'Talk it through with Tobi X before deciding']);
  });

  it('past ten, the count is in figures, as the You board says it', () => {
    const big = aSuggestionFromTheRecord('g-1', record({ leadLabel: 'Wairimu X', commitmentsSettledRecently: { kept: 5, of: 12 } }), DEFAULT_SUGGESTION_THRESHOLDS)!;
    expect(big.factsForThem).toBe('In the last 4 weeks, you kept 5 of your 12 commitments in this check-in. When fewer than half are kept, Groundwork suggests extra help to Wairimu X.');
  });

  it('with nobody named to suggest it to, the person is told who in words', () => {
    const noLead = aSuggestionFromTheRecord('g-1', record({ commitmentsSettledRecently: { kept: 2, of: 8 } }), DEFAULT_SUGGESTION_THRESHOLDS)!;
    expect(noLead.factsForThem).toMatch(/Groundwork suggests extra help to the person who runs this check-in\.$/);
  });

  it.each([[0.5, 'half'], [0.6, 'six in ten'], [0.8, 'eight in ten'], [0.45, '45 in 100']])('a line of %s is said as "%s"', (f, says) => {
    expect(aShareInWords(f as number)).toBe(says);
  });
});
