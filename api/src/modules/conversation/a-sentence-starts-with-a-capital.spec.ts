import { aSentenceStartsWithACapital } from './a-sentence-starts-with-a-capital';

/** The two turns seniorhire saved on run 10, and what the person now reads instead. */
describe('a sentence in a turn starts with a capital, or it is not a sentence', () => {
  it('a broken lead-in to a question loses the lead-in', () => {
    const turn = 'You have completed the health reports for all five clients and found a generally positive picture, with clients satisfied. '
      + 'address two minor issues proactively matters: what specifically did you address, and what did that change?';
    expect(aSentenceStartsWithACapital(turn).text).toBe(
      'You have completed the health reports for all five clients and found a generally positive picture, with clients satisfied. '
      + 'What specifically did you address, and what did that change?',
    );
  });

  it('a broken statement goes, and the question after it stays', () => {
    const turn = "That you haven't explicitly named renewals to David yet is useful to have on record. "
      + 'bring it up in your next one-on-one is a specific next step. What do you expect to have happen in that conversation?';
    expect(aSentenceStartsWithACapital(turn).text).toBe(
      "That you haven't explicitly named renewals to David yet is useful to have on record. What do you expect to have happen in that conversation?",
    );
  });

  it('a question on its own is given its capital, never dropped', () => {
    expect(aSentenceStartsWithACapital('Thanks for that. what happened next?').text).toBe('Thanks for that. What happened next?');
  });

  it('leaves the person\'s own words in quotation marks exactly as they typed them', () => {
    const turn = 'You wrote "sent it. then waited." Who did you send it to?';
    expect(aSentenceStartsWithACapital(turn)).toEqual({ text: turn, changed: false });
  });

  it('is not fooled by e.g. or etc.', () => {
    const turn = 'Some documents, e.g. bank statements, are late. What is holding them up?';
    expect(aSentenceStartsWithACapital(turn)).toEqual({ text: turn, changed: false });
  });
});
