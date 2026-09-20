import { withoutAGuessedPronoun } from './nobody-is-he-or-she-here';

/** Adversarial run 2, 20 Sep 2026: Chika, Bola and Grace were all "he" in the session report. */
describe('nobody is he or she here', () => {
  it('drops the opening pronoun and turns the rest into they', () => {
    expect(withoutAGuessedPronoun('He reports facilitating communication and says his dealers are waiting on stock.'))
      .toBe('Reports facilitating communication and says their dealers are waiting on stock.');
    expect(withoutAGuessedPronoun('She has made two new credit sales and she is covering her payments.'))
      .toBe('Has made two new credit sales and they are covering their payments.');
  });

  it('leaves a sentence with no pronoun alone', () => {
    const s = 'Has the migration running on two of the four services and expects the rest by the end of the month.';
    expect(withoutAGuessedPronoun(s)).toBe(s);
  });

  it('keeps "her" when it is the object, not a possessive guess', () => {
    expect(withoutAGuessedPronoun('Says the manager thanked her.')).toBe('Says the manager thanked her.');
  });
});
