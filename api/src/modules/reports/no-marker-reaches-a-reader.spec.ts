import { cleanText } from './what-the-record-actually-holds';

/**
 * MARKERS ARE MACHINERY. `[VERIFIABILITY:HIGH]` was the one this function was written for, and a
 * real check-in run end to end turned up a second reaching a reader: the shared report's Risks band
 * printed "...hiring goes through her now. [INFERRED: Nadia is being asked to enforce a rule Tunde
 * and Priya do not know exists]" to both people in the check-in.
 *
 * Caught as a family rather than one at a time, because that is the difference between fixing this
 * marker and fixing the next one somebody adds.
 */
describe('no machine marker reaches a reader', () => {
  it('strips the verifiability marker it was written for', () => {
    expect(cleanText('[VERIFIABILITY:HIGH] The CRM is current.')).toBe('The CRM is current.');
  });

  it('and the inference marker found on a real shared report', () => {
    expect(cleanText('I have not told Tunde. [INFERRED: Nadia is being asked to enforce a rule nobody knows]'))
      .toBe('I have not told Tunde.');
  });

  it('and one nobody has invented yet', () => {
    expect(cleanText('She closed three. [CONFIDENCE:LOW]')).toBe('She closed three.');
    expect(cleanText('She closed three. [SOURCE document]')).toBe('She closed three.');
  });

  /** It must not eat a person's own words. Brackets are ordinary punctuation. */
  it('and leaves real brackets alone', () => {
    expect(cleanText('We agreed a number (eight) and a date.')).toBe('We agreed a number (eight) and a date.');
    expect(cleanText('I sent the [draft] over on Tuesday.')).toBe('I sent the [draft] over on Tuesday.');
    expect(cleanText('The KPI [Q3] is the one that matters.')).toBe('The KPI [Q3] is the one that matters.');
    expect(cleanText('It went to HR and IT.')).toBe('It went to HR and IT.');
  });
});
