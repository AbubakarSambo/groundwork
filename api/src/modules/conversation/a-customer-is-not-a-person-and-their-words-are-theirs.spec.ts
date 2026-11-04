import { screen } from './nothing-invented-reaches-them';
import { aCustomerIsNotAPerson } from './no-guessed-pronoun-for-a-named-person';

/**
 * DROP ACCESS RUN 1, ITEMS 30 AND 31. Mercy, day 9 (gw_sweep_drop10). What she had said on day 8, and the customers on record.
 */
const MERCY_SAID = [
  "Kawangware Fresh: Esther hasn't given me a budget yet. Tuskys Westgate is still set for the 28th.",
  "I'll follow up with Esther on Kawangware Fresh tomorrow to see if she has a budget.",
  'Esther says she can spend KES 15,000 for the 3 units. She decides herself.',
];
const KNOWN = [...MERCY_SAID, 'Grace', 'Achieng', 'Mercy', 'Wairimu', 'Joseph', 'Kariuki', 'Kevin', 'Omondi', ...['Tuskys Westgate', 'Kawangware Fresh', 'Mama Mboga Mart', 'Greenfield Supermarket'].map(aCustomerIsNotAPerson)];

describe('Groundwork never speaks as Mercy (item 30)', () => {
  it('her own sentence, said back in the first person, is said back to her as hers', () => {
    const r = screen("I'm following up with Esther on Kawangware Fresh tomorrow to see if she has a budget.", KNOWN, 'Mercy', []);
    expect(r.text).toBe("You're following up with Esther on Kawangware Fresh tomorrow to see if Esther has a budget.");
    expect(r.text).not.toMatch(/^I\b|\bI'm\b/);
  });
  it('the product\'s own "I" is left alone', () => {
    expect(screen('I have one more question before we finish. What will you do about this, and by when?', KNOWN, 'Mercy', []).text)
      .toBe('I have one more question before we finish. What will you do about this, and by when?');
  });
});

describe('a customer\'s name is never taken for a person (item 31)', () => {
  it('"she makes the decision" after Esther at Kawangware Fresh is Esther, never "Fresh"', () => {
    const r = screen('So Esther at Kawangware Fresh has a budget of KES 15,000 for 3 units, and she makes the decision. What is the next step with her, and by when?', KNOWN, 'Mercy', []);
    expect(r.text).not.toMatch(/\bFresh makes\b|\bwith Fresh\b|\bif Fresh\b/);
    expect(r.text).toMatch(/Esther makes the decision/);
  });
});
