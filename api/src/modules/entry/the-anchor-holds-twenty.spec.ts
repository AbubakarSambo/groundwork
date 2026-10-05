import { tooManyForTheAnchor } from './the-anchor-people-step';

/* Decision 99, item 2: the anchor's people step holds the lead plus 19, enforced when it is committed, with a plain sentence. */
describe('the anchor holds 20 people, the lead included', () => {
  const people = (n: number) => Array.from({ length: n }, (_, i) => `person${i + 1}@example.test`);

  it('takes 19 people besides the lead', () => {
    expect(tooManyForTheAnchor(people(19), 'lead@example.test')).toBeNull();
  });

  it('does not count the lead twice, or the same address twice', () => {
    expect(tooManyForTheAnchor([...people(19), 'LEAD@example.test', 'person1@example.test '], 'lead@example.test')).toBeNull();
  });

  it('refuses a twentieth person with a plain sentence that says what to do', () => {
    expect(tooManyForTheAnchor(people(20), 'lead@example.test')).toBe(
      'This one-month Groundwork holds 20 people, and you are one of them, so you can add 19 more. You have added 20, so please take one person off before you start.',
    );
    expect(tooManyForTheAnchor(people(23), 'lead@example.test')).toBe(
      'This one-month Groundwork holds 20 people, and you are one of them, so you can add 19 more. You have added 23, so please take 4 people off before you start.',
    );
  });
});
