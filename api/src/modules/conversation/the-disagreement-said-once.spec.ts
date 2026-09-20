import { alreadySaid, sayTheDisagreementOnce, theSentenceToTheLead, theSentenceToThePerson } from './the-disagreement-said-once';

/** Runs 1-6, 20-21 Sep 2026: Funmi said $400k; Tunde said "the $400k wasn't a figure I was aware of"; nobody said the gap out loud. */
describe('the disagreement, said once', () => {
  const g = { leadName: 'Funmi', target: { name: 'Bring in $400k of new business', target: 400_000 }, theirOwn: ['The first quarter is about landing and building relationships.'] };

  it('to the person: the lead by name, their own words, both on the record', () => {
    expect(theSentenceToThePerson(g)).toBe('Funmi has set this for you: Bring in $400k of new business (400,000). You have said: "The first quarter is about landing and building relationships". This report will show both, side by side.');
    expect(theSentenceToThePerson({ ...g, theirOwn: [] })).toBeNull();
    expect(theSentenceToThePerson({ ...g, target: null })).toBeNull();
  });

  it("to the lead: the product's read of the person, never their words", () => {
    expect(theSentenceToTheLead({ ...g, personName: 'Tunde', personHeadline: 'what he reports has moved away from what this was for' }))
      .toBe("Tunde's own account reads: what he reports has moved away from what this was for. You set Bring in $400k of new business (400,000) for them. That is the gap this report will show.");
    expect(theSentenceToTheLead({ ...g, personName: 'Tunde', personHeadline: null })).toBeNull();
  });

  it('is said once', () => {
    const sentence = theSentenceToThePerson(g)!;
    expect(sayTheDisagreementOnce(sentence, [])).toContain('say it word for word, once');
    expect(alreadySaid(sentence, ['Funmi has set this for you: Bring in $400k of new business (400,000). You have said: "...". This report will show both, side by side.'])).toBe(true);
    expect(sayTheDisagreementOnce(sentence, ['...This report will show both, side by side.'])).toContain('HAS BEEN SAID THIS SESSION');
  });
});
