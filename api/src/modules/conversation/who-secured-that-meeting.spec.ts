import { askWhoSecuredIt, meetingsWithNobodyOnThem, nobodyHasSaidWhoArrangedAnything, ASK_WHO_GOT_IT } from './who-secured-that-meeting';

const said = (...texts: string[]) => texts.map((text, i) => ({ text, session: i + 1 }));

describe('who secured that meeting', () => {
  /* His actual sentence, from the run that found this. */
  it('asks about a meeting reported in the passive', () => {
    const block = askWhoSecuredIt(said('A meeting was held with the Permanent Secretary\'s office, which was a good step forward.'));
    expect(block).toContain(ASK_WHO_GOT_IT);
    expect(block).toContain('who set that up');
    expect(block).toContain('Permanent Secretary');
  });

  it('says nothing where they already said they arranged it', () => {
    expect(askWhoSecuredIt(said('I arranged a meeting with the Director on Tuesday.'))).toBe('');
  });

  it('says nothing where somebody else is credited in their own words', () => {
    expect(askWhoSecuredIt(said('The meeting was set up by their programme manager and I attended.'))).toBe('');
  });

  it('says nothing about a meeting that has not happened', () => {
    expect(askWhoSecuredIt(said('I am going to arrange a meeting with the technical team next week.'))).toBe('');
  });

  it('says nothing where no access was reported at all', () => {
    expect(askWhoSecuredIt(said('I sent the introduction letter and three follow-up emails.'))).toBe('');
  });

  it('asks about the latest one first, and never more than two', () => {
    const open = meetingsWithNobodyOnThem(said(
      'A meeting was held with Planning.',
      'There was a meeting with Legal.',
      'A call was held with the state desk.',
    ));
    expect(open).toHaveLength(2);
    expect(open[0].said).toContain('state desk');
  });

  it('credit given anywhere in the record closes it', () => {
    expect(nobodyHasSaidWhoArrangedAnything(said('A meeting was held with Legal.', 'I set that one up myself.'))).toBe(false);
  });

  /* The rule that keeps it a question rather than an accusation. */
  it('tells the model most answers are "I did", and forbids the follow-up', () => {
    const block = askWhoSecuredIt(said('A meeting was held with the Permanent Secretary.'));
    expect(block).toContain('arranged it themselves');
    expect(block).toContain('never suggest that somebody else arranged it');
    expect(block).toContain('not a challenge');
  });
});
