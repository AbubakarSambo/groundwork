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
  /* Changed 3 November 2026: the tests that read the record's own extraction prompt are deleted with it (the record is written from
     the assessment, which reads the people mentioned and their work). What stays is the check every record line still passes. */
  it('the entries run 6 should have kept pass the same check', () => {
    expect(isTheirs('Victor put in extra hours to make sure the script for the backend was ready', JOSEPH)).toBe(true);
    expect(isTheirs('Victor was responsible for the migration script for existing users',
      'Victor saw my work closely. He was responsible for the migration script for existing users.')).toBe(true);
  });
});
