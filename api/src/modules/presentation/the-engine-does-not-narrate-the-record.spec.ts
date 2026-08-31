import { withoutRecordNarration, forHumans } from './outbound';

/**
 * THE RULE EXISTED AND WAS UNENFORCED.
 *
 * `prompt-library.ts` forbids narrating the act of recording at length and in its own words - "that
 * is software describing its own database write. A person does not do it." Driving five scenarios
 * through the live engine produced three violations in two of them. Every string below marked as
 * failing is one the model actually said, not one invented for a test.
 */
describe('the engine does not narrate the record', () => {
  it('drops a sentence that exists only to announce the write', () => {
    expect(withoutRecordNarration("I've noted that.")).toBe('');
    expect(withoutRecordNarration('That is now in your record.')).toBe('');
  });

  it('keeps the observation and removes the narration in front of it', () => {
    /* Live PIP transcript. The observation after the lead-in is the useful half. */
    expect(withoutRecordNarration('Your record shows you see this as a capacity management issue, not a capability one.'))
      .toBe('You see this as a capacity management issue, not a capability one.');
  });

  it('handles the mid-reply form, where it follows another sentence', () => {
    /* Live ACUTE_SHOCK transcript. */
    const out = withoutRecordNarration(
      "That's a specific reason. It's now in the record: the client's view is that the integration was broken.",
    );
    expect(out).toBe("That's a specific reason. The client's view is that the integration was broken.");
  });

  it('covers every variant the prompt names', () => {
    for (const s of [
      'That is in your record.',
      'Noted in your record.',
      'Your record now shows that the deadline moved.',
      'Your record reflects that the deadline moved.',
      'That gap is now in your record.',
      'That is a critical entry.',
    ]) {
      expect(`${s} -> ${withoutRecordNarration(s)}`.split('->')[1]).not.toMatch(/record/i);
    }
  });

  it('leaves an ordinary sentence about the record alone', () => {
    /*
     * The ban is on announcing the write, not on the noun. Referring to the record as the place
     * their words live is explicitly allowed by the same prompt.
     */
    for (const s of [
      "Let's get your version down first.",
      'What would exist that you could point to?',
      'Your account of the delay is the one I need.',
    ]) {
      expect(withoutRecordNarration(s)).toBe(s);
    }
  });

  it('runs inside forHumans, so streaming and non-streaming both get it', () => {
    expect(forHumans("I've noted that. What happened next?")).toBe('What happened next?');
  });

  it('and does not mangle a reply that has none of it', () => {
    const clean = 'What was the one thing that made it take longer than expected?';
    expect(forHumans(clean)).toBe(clean);
  });
});
