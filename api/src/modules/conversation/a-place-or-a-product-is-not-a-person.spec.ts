import { withoutAGuessedPronoun } from './no-guessed-pronoun-for-a-named-person';

/**
 * NIGHT QUALITY RUN 1, GARBLED NAMES. Esther's setup chat read "M-Pesa codes for all Pesa's sales" and "What
 * specifically do you expect of Bay here?"; Hassan's session read "even though you asked Amina's three times".
 * Each was a "his", "him" or "her" swapped for the last capital word said, which was the end of "M-Pesa", the end
 * of "Kendu Bay", or a name read as an owner.
 */
const roster = [
  'Their names are Collins Odhiambo in Homa Bay, Hassan Mwenda in Kisii, Jared Okoth around Kisumu and Amina Otieno, who runs our stock and field operations.',
  'I want Collins to be able to point at an M-Pesa code for every kit he says he sold, and a signed order from the Kendu Bay women\'s group with a date.',
  'I asked Amina for the stock on Monday.',
];

describe('a pronoun is never swapped for a place or a piece of a word', () => {
  it('never "Pesa\'s sales"', () => {
    const out = withoutAGuessedPronoun('So, for Collins, you expect M-Pesa codes for all his sales.', '', roster);
    expect(out).not.toContain("Pesa's");
    expect(out).toBe("So, for Collins, you expect M-Pesa codes for all Collins's sales.");
  });

  it('never "of Bay"', () => {
    const out = withoutAGuessedPronoun('What specifically do you expect of him here?', 'Collins says the women\'s group in Kendu Bay will order six kits.', roster);
    expect(out).not.toContain('of Bay');
    expect(out).toBe('What specifically do you expect of Collins here?');
  });

  it('never "Amina\'s three times"', () => {
    const out = withoutAGuessedPronoun('Why was the stock late, even though you asked her three times?', 'You said you asked Amina for the stock.', roster);
    expect(out).toBe('Why was the stock late, even though you asked Amina three times?');
  });
});
