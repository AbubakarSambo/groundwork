import { whatYouAskedLastTurn, theQuestionsIn } from './you-asked-that-last-turn';

/**
 * YOU ASKED THAT LAST TURN.
 *
 * The product refuses a third ask and never looked at the second - which is the one people read,
 * because it arrives in the next breath. Measured 18 September 2026 against a demanding client with
 * each of the 22 situations given its own material: 20 of 22 lead conversations and 22 of 22
 * participant ones repeated a question, almost always consecutively.
 */
describe('the question it asked last turn', () => {
  it('is handed back, with the sentence quoted so it is unmistakable', () => {
    const block = whatYouAskedLastTurn('That is useful. What would need to exist for it to be settled?');
    expect(block).toContain('What would need to exist for it to be settled?');
    expect(block).toContain('is the one thing you may not do');
  });

  /*
   * RE-ASKING IS OFTEN RIGHT - they pushed back, or answered something adjacent, and the thing is
   * still not known. What makes it read as not listening is the same words. So this permits one more
   * ask and requires it to be worded differently and to say why.
   */
  it('permits one more ask, differently worded, with a reason', () => {
    const block = whatYouAskedLastTurn('What is stuck?');
    expect(block).toMatch(/come back to it ONCE/);
    expect(block).toMatch(/in different words/);
    expect(block).toMatch(/saying why you are asking again/);
  });

  it('and says to drop it entirely if they answered', () => {
    expect(whatYouAskedLastTurn('What is stuck?')).toMatch(/If they answered it, take what they gave you and move on/);
  });

  it('is nothing at all when the last turn asked nothing', () => {
    expect(whatYouAskedLastTurn('Understood. That is on the record now.')).toBe('');
    expect(whatYouAskedLastTurn('')).toBe('');
    expect(whatYouAskedLastTurn(null)).toBe('');
  });

  it('takes the last question when a turn asked more than one', () => {
    const block = whatYouAskedLastTurn('What moved? And what is stuck?');
    expect(block).toContain('And what is stuck?');
    expect(block).not.toContain('"What moved?"');
  });

  it('reads the questions out of a reply in order', () => {
    expect(theQuestionsIn('One. Two? Three! Four?')).toEqual(['Two?', 'Four?']);
    expect(theQuestionsIn('Nothing here.')).toEqual([]);
  });
});
