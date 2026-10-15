import { RECORD_EXTRACTION_PROMPT } from './prompt-library';
import { isTheirs } from './a-record-is-what-they-said';

/**
 * VICTOR WAS NAMED BY TWO PEOPLE AND APPEARED ZERO TIMES IN NINETEEN RECORD ENTRIES.
 *
 * The recognition scenario of run 6. Joseph Mwangi said Victor's script was the hardest part and
 * that he worked over the weekend of the 14th to finish it. Amara Diallo said Victor was responsible
 * for the migration script. Victor is a contractor, not a participant, so he has no record of his
 * own - what the others said about him is the only place he can appear. The extraction prompt only
 * described a person's own work, so none of it was kept, and the scenario's right answer (name the
 * person nobody had credited) could not be reached from the record.
 *
 * Two things are held here: the prompt says so, and the example it gives would survive the check
 * that throws away any entry not traceable to what the person said. An instruction whose own example
 * would be dropped by isTheirs would teach the model to write entries that are then deleted.
 */
const JOSEPH = [
  "I think Victor's script was the really hard part of this whole thing. He worked over the weekend of the 14th to get it done.",
  'Victor put in extra hours to make sure the script for the backend was ready. That was crucial.',
].join('\n');

describe('the record keeps what somebody says another person did, by name', () => {
  it('the extraction is told to keep it, as PROGRESS, with the name as said', () => {
    expect(RECORD_EXTRACTION_PROMPT).toContain('WHAT SOMEBODY ELSE DID IS ON THE RECORD TOO');
    expect(RECORD_EXTRACTION_PROMPT).toMatch(/a colleague, a contractor, a supplier, a customer, anybody/);
    expect(RECORD_EXTRACTION_PROMPT).toMatch(/If that work was done, it is PROGRESS/);
    expect(RECORD_EXTRACTION_PROMPT).toMatch(/Keep the other person's name exactly as the person said it/);
    expect(RECORD_EXTRACTION_PROMPT).toMatch(/only a name the person used themselves/);
  });

  it('and the example it gives is still their words, so the entry is not thrown away', () => {
    const example = RECORD_EXTRACTION_PROMPT.match(/is recorded as "([^"]+)"/)?.[1];
    expect(example).toBe('Victor worked over the weekend of the 14th to get the script done, and it was the really hard part.');
    expect(isTheirs(example!, JOSEPH)).toBe(true);
  });

  it('and the entries run 6 should have kept pass the same check', () => {
    expect(isTheirs('Victor put in extra hours to make sure the script for the backend was ready', JOSEPH)).toBe(true);
    expect(isTheirs('Victor was responsible for the migration script for existing users',
      'Victor saw my work closely. He was responsible for the migration script for existing users.')).toBe(true);
  });

  it('does not loosen PROGRESS for the person’s own work', () => {
    /* The new paragraph comes after the narrow rule, so the near misses are still routed first. */
    expect(RECORD_EXTRACTION_PROMPT.indexOf('WHAT SOMEBODY ELSE DID')).toBeGreaterThan(
      RECORD_EXTRACTION_PROMPT.indexOf('PROGRESS IS NARROW AND IS THE LAST ONE TO REACH FOR'),
    );
  });
});
