import { withoutAGuessedPronoun } from './no-guessed-pronoun-for-a-named-person';

/**
 * Release check, 9 October: Kito's anchor check-in read "You'll tell Baraka about the yoghurt on Monday. What do you think
 * Baraka'll say?" The pronoun was written as the name and its contraction was left hanging on it. Said in full instead.
 */
const ROSTER = ['Baraka Mutua', 'Kito Dube'];

describe('a contraction on a pronoun that is written as the name', () => {
  it('reads "Baraka will", never "Baraka\'ll"', () => {
    expect(withoutAGuessedPronoun("You'll tell Baraka about the yoghurt on Monday. What do you think he'll say?", '', ROSTER, 'Kito'))
      .toBe("You'll tell Baraka about the yoghurt on Monday. What do you think Baraka will say?");
  });
  it('reads "would" and "had" for the short d, and "is" and "has" for the short s', () => {
    expect(withoutAGuessedPronoun("Baraka asked. What he'd want is clear.", '', ROSTER, 'Kito')).toBe('Baraka asked. What Baraka would want is clear.');
    expect(withoutAGuessedPronoun("Baraka asked. He'd already seen it.", '', ROSTER, 'Kito')).toBe('Baraka asked. Baraka had already seen it.');
    expect(withoutAGuessedPronoun('Baraka asked. Do you think he’s worried?', '', ROSTER, 'Kito')).toBe('Baraka asked. Do you think Baraka is worried?');
    expect(withoutAGuessedPronoun("Baraka asked. He's been waiting.", '', ROSTER, 'Kito')).toBe('Baraka asked. Baraka has been waiting.');
  });
});
