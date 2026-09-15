import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * ASKED ABOUT HER BEFORE ASKING ABOUT THE THING SHE CAME TO DO.
 *
 * A lead chose "Set Goals and Keep the Team on Track", said what she wanted, and question two was
 * "And what is your part in setting these goals and keeping the team on track?" Before a single word
 * about the goals.
 *
 * Her words: "the your part question should come last, it should ask what the goals, objectives or
 * workplan are, this feels off."
 *
 * The question has a real reason - 237 of the last 239 people had no role recorded because nothing
 * asked, and their own check-in's questions are shaped by it - so it moves rather than goes.
 */
describe('what they came for comes first', () => {
  /*
   * Comments out first. Every line asserted below is prompt copy the model is actually sent, so
   * stripping changes no result today - it stops a future explanation of the rule standing in for
   * the rule.
   */
  const src = readFileSync(join(__dirname, 'entry.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('says the role question is not the second thing asked', () => {
    expect(src).toMatch(/AND IT IS NOT THE SECOND THING YOU ASK/);
    expect(src).toMatch(/After the thing they came here to do, never before it/);
  });

  it('keeps the reason it is asked at all, so nobody deletes it later', () => {
    expect(src).toMatch(/skipped by 237 of the\s+last 239 people/);
    expect(src).toMatch(/questions their own check-in gets are shaped by it/);
  });

  it('and says what it reads as when it comes first', () => {
    expect(src).toMatch(/reads as a form\s+collecting fields/);
  });
});
