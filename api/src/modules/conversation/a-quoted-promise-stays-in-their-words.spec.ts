import { inYourPerson } from './their-words-in-your-person';

/**
 * Release check, 9 October: Lerato wrote "I will ask Grace in finance if we can print the labels ourselves by Friday." and was asked
 * "Would you like me to write down You will ask Grace in finance if we can print the labels ourselves by Friday as something you will do?"
 */
const said = ['I will ask Grace in finance if we can print the labels ourselves by Friday.'];

describe('their words offered back in quotation marks are not turned round', () => {
  it('keeps "I will" inside straight and curly quotes', () => {
    expect(inYourPerson('Would you like me to write down "I will ask Grace in finance if we can print the labels ourselves by Friday" as something you will do?', said))
      .toBe('Would you like me to write down "I will ask Grace in finance if we can print the labels ourselves by Friday" as something you will do?');
    expect(inYourPerson('Would you like me to write down “I will ask Grace in finance if we can print the labels ourselves by Friday” as something you will do?', said))
      .toBe('Would you like me to write down “I will ask Grace in finance if we can print the labels ourselves by Friday” as something you will do?');
  });
  it('turns them round without a capital in the middle of a sentence when there are no quotes', () => {
    expect(inYourPerson('Would you like me to write down I will ask Grace in finance if we can print the labels ourselves by Friday as something you will do?', said))
      .toBe('Would you like me to write down you will ask Grace in finance if we can print the labels ourselves by Friday as something you will do?');
  });
  it('still turns a sentence of theirs said back at the start', () => {
    expect(inYourPerson('I will ask Grace in finance if we can print the labels ourselves by Friday. What would help?', said))
      .toBe('You will ask Grace in finance if we can print the labels ourselves by Friday. What would help?');
  });
});
