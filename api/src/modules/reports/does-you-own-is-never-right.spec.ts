import { theVerbAgreesWithYouIn } from './party-labels';

/**
 * "WHAT SPECIFIC DECISIONS ABOUT THE PRODUCT DOES YOU OWN?" (run 32, the cofounder lead's report).
 *
 * A question written about Ada becomes a question about "you", and the auxiliary is left behind.
 * There is no reading of English where "does you own" is right, which is what makes this one safe
 * to do with a rule.
 *
 * THE COORDINATED VERBS FROM THE SAME RUN ARE NOT DONE HERE, on purpose - "You see a lack of
 * forward momentum and attributes it to the team's culture". A regex for those was written on 25
 * September, fixed three sentences and broke two, and was removed. They belong in the automatic
 * check of task 1.6, where the reader is known and the line can be rewritten whole.
 */
describe('"does you" is never right', () => {
  it('fixes the sentence from run 32', () => {
    expect(theVerbAgreesWithYouIn('What specific decisions about the product does you own?'))
      .toBe('What specific decisions about the product do you own?');
  });

  it('fixes it at the start of a sentence too', () => {
    expect(theVerbAgreesWithYouIn('Does you own the renewal conversation?')).toBe('Do you own the renewal conversation?');
  });

  it('leaves "is you" alone, because that one can be right', () => {
    /* "The person responsible is you." is correct English and must not become "are you". */
    expect(theVerbAgreesWithYouIn('The person responsible is you.')).toBe('The person responsible is you.');
  });

  it('leaves a third-person verb that is not next to "you"', () => {
    expect(theVerbAgreesWithYouIn('Daniel Park does own the renewals.')).toBe('Daniel Park does own the renewals.');
  });

  it('does not touch the coordinated verbs, which are task 1.6', () => {
    const asIs = 'You see a lack of forward momentum and attributes it to the team culture.';
    expect(theVerbAgreesWithYouIn(asIs)).toBe(asIs);
  });
});
