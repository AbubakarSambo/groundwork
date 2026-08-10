import { countsAccounts, tallyInReport } from './counts-accounts';

/**
 * COUNTING IS A VERDICT ON SHARED WORK AND THE DIAGNOSIS ON A COHORT.
 *
 * "Never count the accounts" is absolute where people work together, and it has
 * to be: six people describing one delay they all saw are not six pieces of
 * evidence, they are one, and a headcount dressed as a finding is the easiest
 * way for this product to launder consensus into truth.
 *
 * A cohort inverts every part of that. Fourteen field officers in fourteen
 * districts who have never met, given the same induction, and nine of them
 * describe the same escalation rule the same wrong way. Nobody could have copied
 * anybody. The count is the only thing that distinguishes one person
 * misunderstanding from one briefing misteaching - and the second is the finding
 * the ground exists to produce.
 *
 * Found while writing the cohort example for the marketing page: the panel
 * counted, correctly, and the detector would have flagged the real report that
 * produced it as a violation.
 */

const cohortReport = {
  sharedPicture:
    'Nine of the fourteen describe a stock-out as something that goes in the weekly report. The policy is a phone call the same day.',
};

const sharedWorkReport = {
  sharedPicture:
    'Four of the six described the same delay, so the delay is the main risk to the quarter.',
};

describe('where people work together', () => {
  it('flags a tally, which is the original rule and the common case', () => {
    // THE REGRESSION. Agreement between people describing one shared event is
    // not independent evidence, however many of them there are.
    expect(tallyInReport(sharedWorkReport)).toMatchObject({ phrase: 'Four of the six' });
  });

  it('flags it whether or not the flag is passed, because true is the default', () => {
    expect(tallyInReport(sharedWorkReport, true)).not.toBeNull();
    expect(tallyInReport(sharedWorkReport)).not.toBeNull();
  });
});

describe('where nobody sees anybody else\'s work', () => {
  it('does not flag a tally, because the tally is the finding', () => {
    // THE REGRESSION THIS FILE EXISTS FOR. A correct cohort report was being
    // reported as a violation of a rule that does not apply to it.
    expect(tallyInReport(cohortReport, false)).toBeNull();
  });

  it('and the same sentence WOULD be flagged if those people worked together', () => {
    // The two halves side by side, so the exception cannot be mistaken for the
    // detector having simply stopped working.
    expect(tallyInReport(cohortReport, true)).not.toBeNull();
    expect(tallyInReport(cohortReport, false)).toBeNull();
  });
});

describe('the detector itself is untouched', () => {
  it('still recognises every shape it recognised before', () => {
    expect(countsAccounts('two of the three said so')).toBeTruthy();
    expect(countsAccounts('most people felt the same')).toBeTruthy();
    expect(countsAccounts('all but one agreed')).toBeTruthy();
  });

  it('and still leaves ordinary sentences alone', () => {
    expect(countsAccounts('The migration has no owner and no date.')).toBeNull();
  });
});
