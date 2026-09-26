import { whatMoreThanOnePersonNamed, namesIn } from './what-more-than-one-person-named';

/*
 * VICTOR WAS NAMED BY TWO PEOPLE AND THE JUDGEMENT WAS NEVER TOLD.
 *
 * The recognition scenario, fix6-4, as it sits in the record. Joseph's only mention of Victor
 * starts his sentence, and a one-word capital at the start of a sentence was skipped as probably
 * just a capital letter. These are the three sentences, exactly.
 */
describe('a name at the start of a sentence still counts when the same name is used elsewhere', () => {
  const AMARA = [
    'Victor worked closely with me on the implementation, especially migrating existing users.',
    'The migration of the existing users was a significant technical challenge that Victor handled very well. It made the launch smooth for everyone.',
  ];
  const JOSEPH = ["Victor's backend script relies on the front-end forms."];

  it('reports Victor as named by Amara and Joseph', () => {
    const shared = whatMoreThanOnePersonNamed(
      [{ who: 'Amara Diallo', texts: AMARA }, { who: 'Joseph Mensah', texts: JOSEPH }],
      ['Amara Diallo', 'Joseph Mensah'],
    );
    const victor = shared.find((s) => s.name === 'Victor');
    expect(victor).toBeDefined();
    expect(victor!.who).toEqual(['Amara Diallo', 'Joseph Mensah']);
    expect(victor!.asSaid.find((q) => q.who === 'Joseph Mensah')!.said).toBe(JOSEPH[0]);
  });

  it('and where nobody used the name mid-sentence, a possessive anywhere makes it known (fix6-5)', () => {
    const shared = whatMoreThanOnePersonNamed(
      [
        { who: 'Joseph Mensah', texts: ["Victor's script was the hardest part of this whole thing. He worked on it the weekend of the 14th."] },
        { who: 'Amara Diallo', texts: ['Victor, the contractor, was responsible for the migration script that brought over the existing users.'] },
      ],
      ['Amara Diallo', 'Joseph Mensah'],
    );
    const victor = shared.find((s) => s.name === 'Victor');
    expect(victor).toBeDefined();
    expect([...victor!.who].sort()).toEqual(['Amara Diallo', 'Joseph Mensah']);
  });

  it('and a possessive alone is enough, even where nobody used the name mid-sentence', () => {
    expect(namesIn(JOSEPH[0], new Set())).toContain('Victor');
  });

  it('"The" and "It" at the start of a sentence are still not names', () => {
    const shared = whatMoreThanOnePersonNamed(
      [{ who: 'Amara Diallo', texts: AMARA }, { who: 'Joseph Mensah', texts: [...JOSEPH, 'The forms are late. It is fine.'] }],
    );
    const names = shared.map((s) => s.name);
    expect(names).not.toContain('The');
    expect(names).not.toContain('It');
  });

  it('a sentence-start word that never appears mid-sentence and has no possessive is still skipped', () => {
    const shared = whatMoreThanOnePersonNamed([
      { who: 'Amara Diallo', texts: ['Migrating the users took a week.'] },
      { who: 'Joseph Mensah', texts: ['Migrating the forms took two days.'] },
    ]);
    expect(shared.map((s) => s.name)).not.toContain('Migrating');
  });

  it('a contraction is not a possessive', () => {
    expect(namesIn("Let's move the launch.", new Set())).not.toContain('Let');
    expect(namesIn("Here's the plan.", new Set())).not.toContain('Here');
  });

  it('namesIn with no second argument behaves exactly as before', () => {
    expect(namesIn("Victor's backend script relies on the front-end forms.")).not.toContain('Victor');
    expect(namesIn('Victor worked closely with me.')).not.toContain('Victor');
  });
});
