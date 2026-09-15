import { whatTheyDeclined, withoutWhatTheyDeclined } from './what-they-declined-is-not-a-gap';

/**
 * THE REAL SESSION, AND THE OPEN ITEM SHE ACTUALLY GOT.
 *
 * She declined the strategy question twice, in her own words below, and her report carried "Link to
 * company strategy" with a line telling her to go and do it next session. Her verdict on the report:
 * "it looks a bit rude and will put off the lead", and "in this case it is not accurate".
 */
describe('what they declined is not a gap', () => {
  const turns = [
    { role: 'assistant', content: 'Now, how does this objective of 500 contracts and linked sales connect to the company\'s overall direction, as you understand it?' },
    { role: 'user', content: 'this line of questioning does not align with what i need to do, please just set targets for my team and track it' },
    { role: 'assistant', content: 'What specific targets will each of them have towards this overall objective?' },
    { role: 'user', content: '150 each and i have a target of 50' },
  ];

  it('knows which question she refused', () => {
    const declined = whatTheyDeclined(turns);
    expect(declined).toHaveLength(1);
    expect(declined[0]).toContain("company's overall direction");
  });

  it('drops the open item that hands it straight back to her', () => {
    const items = [
      {
        title: 'Link to company strategy',
        observation: "This session established a clear sales objective, but its direct connection to the company's overall strategy was not explored.",
        recommendedMove: "In the next session, connect this sales goal to the company's main priority for the year.",
      },
      {
        title: 'Individual targets not yet agreed with each person',
        observation: 'The 150-contract target per person has not been confirmed by the people carrying it.',
        recommendedMove: 'Ask each of them whether 150 is the right number.',
      },
    ];
    const kept = withoutWhatTheyDeclined(items, turns);
    expect(kept.map((k) => k.title)).toEqual(['Individual targets not yet agreed with each person']);
  });

  it('changes nothing when nobody declined anything', () => {
    const plain = [
      { role: 'assistant', content: 'What is the target?' },
      { role: 'user', content: '500 contracts by December' },
    ];
    const items = [{ title: 'Link to company strategy', observation: 'not explored' }];
    expect(withoutWhatTheyDeclined(items, plain)).toHaveLength(1);
  });

  it('does not treat ordinary disagreement about the work as a refusal', () => {
    const cross = [
      { role: 'assistant', content: 'When does the migration land?' },
      { role: 'user', content: 'the migration date is wrong, we never agreed that' },
    ];
    expect(whatTheyDeclined(cross)).toHaveLength(0);
  });
});

describe('a why-it-matters line that says the opposite of its point', () => {
  const { saysTheOppositeOfWhatItMeans, putTheMissingWordBack } = require('./what-they-declined-is-not-a-gap');
  const real = 'with a clear link, the team might hit its numbers but not contribute to the most important company goals, or face resource conflicts with other teams.';

  it('catches the line off the real report', () => {
    expect(saysTheOppositeOfWhatItMeans(real)).toBe(true);
    expect(putTheMissingWordBack(real)).toMatch(/^Without a clear link/);
  });

  it('leaves the rest of the sentence exactly as written', () => {
    expect(putTheMissingWordBack(real)).toContain('face resource conflicts with other teams.');
  });

  it('leaves a line that was already right', () => {
    for (const ok of [
      'Without a named owner this will slip again.',
      'With the finance team confirming it, this is checkable by anybody.',
      'Nobody can tell whether the number moved.',
    ]) expect(saysTheOppositeOfWhatItMeans(ok)).toBe(false);
  });
});
