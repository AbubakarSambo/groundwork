import { howManyAnsweredInWords, theCountSaidRight, thePictureInstruction, inOneFormOfNumber } from './the-picture-in-plain-sentences';

/**
 * "ALL TWO PEOPLE HAVE ANSWERED." Seniorhire, run 10, the participant's own report, three rounds of it.
 * The model wrote it, from the example "All four people have checked in". The count is the product's
 * arithmetic, so the product now says it, for every count, and the model is handed the sentence.
 */
describe('how many have answered, for every count', () => {
  it.each([
    [1, 1, 'One person has answered.'],
    [2, 2, 'Both people have answered.'],
    [3, 3, 'All three people have answered.'],
    [9, 9, 'All nine people have answered.'],
    [12, 12, 'All 12 people have answered.'],
    [0, 4, 'Nobody has answered yet.'],
    /* All in words or all in figures in one sentence, 28 Sep 2026 (screens request 69). */
    [1, 3, 'One of the three people has answered so far.'],
    [2, 5, 'Two of the five people have answered so far.'],
    [12, 41, '12 of the 41 people have answered so far.'],
  ])('%i of %i: %s', (answered, expected, says) => {
    expect(howManyAnsweredInWords(answered, expected)).toBe(says);
    expect(howManyAnsweredInWords(answered, expected)).not.toMatch(/\bAll (?:two|one|2|1)\b/i);
  });
});

describe('the opening starts with the product\'s count, whatever the model wrote', () => {
  const rest = ' They disagree on one thing: what it means for you to own the client relationships.';

  it('replaces "All two people have answered." with "Both people have answered."', () => {
    expect(theCountSaidRight(`All two people have answered.${rest}`, 2, 2)).toBe(`Both people have answered.${rest}`);
  });

  it('and any other count sentence with the right one', () => {
    expect(theCountSaidRight('All 3 people have checked in. The target is eight.', 3, 3)).toBe('All three people have answered. The target is eight.');
    expect(theCountSaidRight('Two of four people have answered so far.', 2, 4)).toBe('Two of the four people have answered so far.');
    expect(theCountSaidRight('Both people have checked in.', 1, 2)).toBe('One of the two people has answered so far.');
  });

  it('leaves an opening alone when its first sentence says more than the count, or is not a count', () => {
    const more = 'Both people have checked in, and they agree the target is eight.';
    expect(theCountSaidRight(more, 2, 2)).toBe(more);
    const other = 'The initiator and Participant A disagree on the target.';
    expect(theCountSaidRight(other, 2, 2)).toBe(other);
  });

  it('and the model is handed the sentence to open with', () => {
    const prompt = thePictureInstruction({ peopleAnswered: 2, peopleExpected: 2, differenceTopics: [], aboutOnePerson: false } as any);
    expect(prompt).toContain('Open with this sentence, exactly as it is: "Both people have answered."');
  });
});

describe('one form of number in one count (request 90)', () => {
  it('says "Four of the six", never "Four of the 6"', () => {
    expect(inOneFormOfNumber('Four of the 6 people have answered so far.')).toBe('Four of the six people have answered so far.');
    expect(inOneFormOfNumber('They said 4 of the six people agree.')).toBe('They said four of the six people agree.');
    expect(inOneFormOfNumber('Twelve of the 41 people have answered.')).toBe('12 of the 41 people have answered.');
    expect(theCountSaidRight('Four of the 6 people have answered so far, and they agree.', 4, 6)).toBe('Four of the six people have answered so far, and they agree.');
  });
});
