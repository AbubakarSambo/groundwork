import { withoutTheSentenceThatSaysItBack, doNotSayItBack, opensByRepeatingThem } from './asked-twice-and-told-no-twice';

/*
 * Measured across nineteen live check-ins on 15 September 2026: the restating guard fired 75 times,
 * the retry fixed it 12, and 58 times the model said it back again and the first reply stood. As a
 * detector it works; as an instruction it did not.
 *
 * Two changes came out of that. The instruction now quotes the offending sentence back and says
 * what the first sentence must carry instead. And where even that fails, the sentence comes off -
 * the one place in this codebase where a guard edits the text, and it is allowed here because the
 * sentence being removed carries nothing the person did not just say.
 */
describe('when it says it back twice', () => {
  const theySaid = 'We are at 180 so far. Rita is at about 90, Kunle maybe 40, Amir has not really started.';
  const restating = 'You are at 180 in total, with Rita at 90, Kunle at 40 and Amir yet to start. What is in the way for Amir?';

  it('the instruction quotes the sentence that did it', () => {
    const ask = doNotSayItBack(theySaid, restating);
    expect(ask).toContain('You are at 180 in total, with Rita at 90, Kunle at 40 and Amir yet to start.');
    expect(ask).toMatch(/with that sentence GONE/);
  });

  it('and says what the first sentence must carry instead, not only what it must not', () => {
    const ask = doNotSayItBack(theySaid, restating);
    expect(ask).toMatch(/must carry something they do not already have/);
    expect(ask).toMatch(/the question itself, asked straight/);
  });

  it('drops the opening sentence when the model will not', () => {
    const left = withoutTheSentenceThatSaysItBack(theySaid, restating);
    expect(left).toBe('What is in the way for Amir?');
    expect(opensByRepeatingThem(theySaid, left!)).toBe(false);
  });

  it('leaves a one-sentence reply alone, because there is nothing behind it', () => {
    expect(withoutTheSentenceThatSaysItBack(theySaid, 'You are at 180 in total with Rita at 90.')).toBeNull();
  });

  it('leaves it alone when what is left asks nothing, so this cannot make a dead end', () => {
    const noQuestion = `${restating.split('?')[0]}? `.replace('What is in the way for Amir?', '');
    expect(withoutTheSentenceThatSaysItBack(theySaid, 'You are at 180 in total. That is good progress.')).toBeNull();
    expect(noQuestion.length).toBeGreaterThan(0);
  });

  it('leaves it alone when the restatement is not the opening sentence', () => {
    const later = 'What is in the way for Amir? You are at 180 in total, with Rita at 90 and Kunle at 40.';
    expect(withoutTheSentenceThatSaysItBack(theySaid, later)).toBeNull();
  });

  it('and leaves a reply that never restated them completely alone', () => {
    const clean = 'Sixty of the hundred and fifty. What is holding up the supply side?';
    expect(withoutTheSentenceThatSaysItBack(theySaid, clean)).toBeNull();
  });
});
