import { withoutTheMark, forHumans } from './outbound';

/**
 * A quarter of the AI turns on the local database opened by grading the answer before asking the
 * next question, and that is what "it sounds like an examiner" turned out to mean. These examples
 * are real turns, verbatim.
 *
 * The line this walks is the important part: a sentence that is ONLY a mark goes, and a sentence
 * that grades while carrying content stays, because dropping it would delete what the person said
 * in order to fix how it was received. The second kind is the character sketch's job.
 */
describe('the sentence that only marks the answer', () => {
  it('drops a sentence that is nothing but a mark', () => {
    const out = withoutTheMark("That's a specific example, which is helpful. If someone reviewed that two-week period, what would they find?");
    expect(out).toBe('If someone reviewed that two-week period, what would they find?');
  });

  it('drops the thanks-for-answering opener', () => {
    expect(withoutTheMark('Thank you for starting with that. When did you first hear?')).toBe('When did you first hear?');
  });

  it('KEEPS a graded sentence that carries what the person said', () => {
    /*
     * "Eighteen percent" is theirs. The framing is wrong and the sketch handles the framing; this
     * must not delete the number to fix the tone.
     */
    const turn = 'Eighteen percent of recurring revenue is a clear and specific impact. When did you first learn?';
    expect(withoutTheMark(turn)).toContain('Eighteen percent of recurring revenue');
  });

  it('keeps an observation that happens to start with "that"', () => {
    /* The voice this is protecting says exactly these. A stripper that ate them would be worse. */
    for (const keep of [
      'That is the whole problem. Who else is waiting on him?',
      'That stops being a communication problem around the second time.',
      'That second part is its own problem.',
    ]) {
      expect(withoutTheMark(keep)).toBe(keep);
    }
  });

  it('never returns an empty turn, even if the model sent only a mark', () => {
    const onlyMark = "That's a really important distinction.";
    expect(withoutTheMark(onlyMark)).toBe(onlyMark);
  });

  it('runs as part of what a person is actually sent', () => {
    /* The unit is only worth anything if it is in the pipeline. */
    expect(forHumans("That's a specific example, which is helpful. What would the evidence show?"))
      .toBe('What would the evidence show?');
  });

  it('and the record narration is caught mid-sentence now, where it was hiding', () => {
    const out = forHumans("That's a specific reason, and it's now in the record: the integration was broken.");
    expect(out).not.toMatch(/in the record/i);
    expect(out).toContain('integration was broken');
  });

  it('catches the record narration with words wedged into it, which is how it survived', () => {
    /*
     * The live opener said "Your record from last time shows the pricing approval process is the
     * main blocker". The stripper knew "your record shows" and "your record now shows"; three words
     * in the middle walked straight through it.
     */
    const out = forHumans('Your record from last time shows the pricing approval process is the main blocker.');
    expect(out).not.toMatch(/record/i);
    expect(out).toContain('pricing approval process is the main blocker');
  });
})

describe('praise moves when you block it', () => {
  it('drops praise of the person, which is what appeared once grading the answer was banned', () => {
    /*
     * Live, on the first turn after the ban: "That is the kind of honesty that makes problems
     * solvable." The same act as "that's a specific example", now aimed at the person rather than
     * their answer - which is worse in a product whose whole claim is that it does not read people.
     */
    const out = forHumans('You named your part before I asked. That is the kind of honesty that makes problems solvable. The pattern has not changed.');
    expect(out).not.toMatch(/kind of honesty/i);
    expect(out).toContain('You named your part before I asked');
    expect(out).toContain('The pattern has not changed');
  });
});
