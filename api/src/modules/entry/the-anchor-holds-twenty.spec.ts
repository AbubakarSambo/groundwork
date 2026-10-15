import { tooManyForTheAnchor } from './the-anchor-people-step';

/* Decision 121, item 4: the anchor holds up to 20 people besides the lead, enforced when it is committed, with a plain sentence.
   This spec used to say the lead plus 19 (decision 99, item 2); that counted the lead among the 20, which the spec does not. */
describe('the anchor holds 20 people besides the lead', () => {
  const people = (n: number) => Array.from({ length: n }, (_, i) => `person${i + 1}@example.test`);

  it('takes 20 people besides the lead', () => {
    expect(tooManyForTheAnchor(people(20), 'lead@example.test')).toBeNull();
  });

  it('does not count the lead twice, or the same address twice', () => {
    expect(tooManyForTheAnchor([...people(20), 'LEAD@example.test', 'person1@example.test '], 'lead@example.test')).toBeNull();
  });

  it('refuses a twenty-first person with a plain sentence that says what to do', () => {
    expect(tooManyForTheAnchor(people(21), 'lead@example.test')).toBe(
      'This one-month Groundwork holds up to 20 people besides you. You have added 21, so please take one person off before you start.',
    );
    expect(tooManyForTheAnchor(people(24), 'lead@example.test')).toBe(
      'This one-month Groundwork holds up to 20 people besides you. You have added 24, so please take 4 people off before you start.',
    );
  });
});
