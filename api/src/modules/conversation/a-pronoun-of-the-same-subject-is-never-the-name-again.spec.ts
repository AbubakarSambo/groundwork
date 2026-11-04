import { screen } from './nothing-invented-reaches-them';
import { aCustomerIsNotAPerson, withoutAGuessedPronoun } from './no-guessed-pronoun-for-a-named-person';

/**
 * THE DROP ACCESS SHORT RUN (gw_sweep_drop3, 12 to 14 October), ITEM 3. The pass that writes a name in place of a guessed pronoun
 * sent out, in the check-ins as the conversation holds them:
 *   Mercy, 13 October:  "You mentioned Joseph is still dragging Joseph's feet with the samples for Tuskys Westgate."
 *   Joseph, 13 October: "That means the ball is in She's court."
 *   Joseph, 14 October: "She is the owner, so She has the final decision on purchases."
 *   Kevin, 14 October:  "Jane saying Jane will pay on Friday is a good sign."
 * A capital pronoun in somebody's own words ("She's the owner, so she decides.") was taken for a name, and a name that was already
 * the subject of the clause was said a second time in place of its own pronoun.
 */
const PEOPLE = ['Grace', 'Achieng', 'Mercy', 'Wairimu', 'Joseph', 'Kariuki', 'Kevin', 'Omondi'];
const CUSTOMERS = ['Kilele Hotel', 'Greenfield Supermarket', 'Mama Pima Stores', 'Savannah Cafe', 'Upper Hill Offices', 'Tuskys Westgate', 'Juja Hardware', 'Ngong Road Minimart', 'Mama Mboga Mart'].map(aCustomerIsNotAPerson);

const MERCY_SAID = ['Joseph is still dragging his feet though. I called him about the samples and he said Thursday now. So Tuskys Westgate is still waiting on those.'];
const JOSEPH_SAID = ["Yes, she still wants 12,000 KES off for the 10 units. She hasn't replied since Monday.", "Mama Pima is waiting on us. I guess she's waiting for us to respond to her discount request.", 'Wanjiru said to call her next week.', 'Wanjiru is the owner.'];
const KEVIN_SAID = ["Jane said she'll pay a KES 15,000 deposit on Friday.", "Jane wants 6 units for the cafe. She's the owner, so she decides. She's paying a deposit on Friday."];
const known = (said: string[], ...more: string[]) => [...said, ...more, ...PEOPLE, ...CUSTOMERS];

describe('a pronoun is never written as a capital pronoun, nor as the name the clause already has', () => {
  it('Mercy reads "Joseph is still dragging their feet", never "Joseph\'s feet"', () => {
    const r = screen('Understood. You mentioned Joseph is still dragging his feet with the samples for Tuskys Westgate.', known(MERCY_SAID), 'Mercy', []);
    expect(r.text).toBe('Understood. You mentioned Joseph is still dragging their feet with the samples for Tuskys Westgate.');
  });

  it('Joseph reads the ball is in Wanjiru\'s court, never "She\'s court"', () => {
    const out = withoutAGuessedPronoun('That means the ball is in her court.', "Wanjiru pushing hard for a big discount at Mama Pima Stores is exactly the kind of unexpected thing we should put on record.", known(JOSEPH_SAID, 'Wanjiru'), 'Joseph');
    expect(out).toBe("That means the ball is in Wanjiru's court.");
    expect(out).not.toMatch(/\bShe['’]s court/);
  });

  it('"She is the owner, so she has" never comes out with "She" in the middle of the sentence', () => {
    const r = screen('She is the owner, so she has the final decision on purchases.', known(JOSEPH_SAID, 'Wanjiru'), 'Joseph', ['So Wanjiru will be ready to discuss the discount next week.']);
    expect(r.text).not.toMatch(/\bso She\b/);
    expect(r.text).not.toMatch(/[a-z,]\s+(?:She|He|Her|His)\b/);
  });

  it('Kevin reads "Jane saying they will pay on Friday", never "Jane saying Jane will pay"', () => {
    const out = withoutAGuessedPronoun('Jane saying she will pay on Friday is a good sign.', '', known(KEVIN_SAID), 'Kevin');
    expect(out).toBe('Jane saying they will pay on Friday is a good sign.');
  });

  it('the verb after "they" agrees, and a name that is the object is still written as the name', () => {
    expect(withoutAGuessedPronoun('Jane says she decides on Friday.', '', known(KEVIN_SAID), 'Kevin')).toBe('Jane says they decide on Friday.');
    expect(withoutAGuessedPronoun("Jane thinks she's ready.", '', known(KEVIN_SAID), 'Kevin')).toBe("Jane thinks they're ready.");
    expect(withoutAGuessedPronoun('You will call Jane to ask if she is ready.', '', known(KEVIN_SAID), 'Kevin')).toBe('You will call Jane to ask if Jane is ready.');
  });
});
