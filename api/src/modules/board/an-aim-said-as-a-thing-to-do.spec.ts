import { anAimAsASentence, theAimItself } from './an-aim-is-a-sentence-about-somebody';

/** Drop Access, 16 October: Mercy's share read "You are aiming for 40 Sell 40 units." */
describe('an aim said as a thing to do is the thing it counts', () => {
  it('"Sell 40 units" is 40 units, and "Open 10 new leads weekly" is 10 new leads weekly', () => {
    expect(anAimAsASentence('Sell 40 units', { speaker: 'Mercy', holder: 'Mercy', target: 40 })).toBe('Mercy is aiming for 40 units.');
    expect(anAimAsASentence('Open 10 new leads weekly', { speaker: 'Mercy', holder: 'Mercy', target: 10 })).toBe('Mercy is aiming for 10 new leads weekly.');
    expect(theAimItself('Sell 40 units', 40)).toBe('40 units');
  });
  it('a verb with no number after it is left as it was', () => {
    expect(anAimAsASentence('Sell the old stock', { speaker: 'Mercy', holder: 'Mercy', target: null })).toBe('Sell the old stock.');
  });
});
