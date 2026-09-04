import { worthRecording, AUTHORED_AT_SETUP, WHAT_RECORDING_IT_MEANS } from './what-setup-agreed';

describe('what setup is allowed to record', () => {
  it('records something checkable', () => {
    expect(worthRecording('Three proposals out to named buyers by the end of October')).toBe(true);
    expect(worthRecording('Own the weekly number end to end')).toBe(true);
  });

  it('refuses a sentence nobody can meet or miss', () => {
    /*
     * Worse than no objective at all: it looks like a standard, cannot be met or missed, and the
     * first check-in will measure somebody against it anyway.
     *
     * EACH OF THESE IS LONG ENOUGH AND WORDY ENOUGH TO PASS THE GENERIC CHECKS. My first version of
     * this test used the bare phrases, which are all too short anyway - so deleting the thin-phrase
     * list entirely left the test green and proved nothing.
     */
    for (const thin of [
      'I want them to be more proactive',
      'They should hit the ground running',
      'I would like them to be a team player',
      'I need them to deliver results.',
    ]) {
      expect([thin, worthRecording(thin)]).toEqual([thin, false]);
    }
  });

  it('but keeps a thin phrase that has something real attached to it', () => {
    /* "Take ownership" alone says nothing; taking ownership OF something is an expectation. */
    expect(worthRecording('I want them to take ownership of the weekly revenue number')).toBe(true);
  });

  it('refuses anything too short to be a standard, even with a number in it', () => {
    /*
     * A digit is otherwise enough to pass, so this is the case the length floor alone catches.
     * "3 sales" is a note to self, not a standard somebody can be held to.
     */
    expect(worthRecording('3 sales')).toBe(false);
    expect(worthRecording('ship it')).toBe(false);
  });

  it('refuses a fragment', () => {
    expect(worthRecording('sales')).toBe(false);
    expect(worthRecording('  ')).toBe(false);
  });

  it('says who wrote it, and it is not us', () => {
    /* So the record can tell an expectation somebody set from one the product inferred. */
    expect(AUTHORED_AT_SETUP).toBe('lead-setup');
  });
});

describe('what the lead is told before anything is written', () => {
  it('says it is their expectation and not agreement', () => {
    expect(WHAT_RECORDING_IT_MEANS).toContain('YOUR expectation, not as something agreed');
  });

  it('says it is marked unseen and what that protects', () => {
    /* seenBySubject false is what the six explanations read to refuse pressing anybody about a
       thing nobody showed them. It is true here by construction. */
    expect(WHAT_RECORDING_IT_MEANS).toContain('not yet seen by them');
    expect(WHAT_RECORDING_IT_MEANS).toContain('nothing in the record will hold them to it');
  });

  it('and says the first check-in asks their version first', () => {
    expect(WHAT_RECORDING_IT_MEANS).toContain('asks what they understood, in their own words, before it shows them');
    expect(WHAT_RECORDING_IT_MEANS).toContain('that difference is the finding');
  });
});
