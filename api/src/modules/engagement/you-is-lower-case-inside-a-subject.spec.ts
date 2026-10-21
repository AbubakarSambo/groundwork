import { theFirstInsight, theFirstOpenDifference } from './the-first-insight';

/**
 * A CAPITAL "YOU" IN THE MIDDLE OF A SUBJECT (messages test, 19 October, finding 8).
 *
 * Drop Access (test), Wednesday 14 October. Grace's report email had the subject: In "Sales team, Q4", You and the team are not aligned on
 * how to measure progress toward the main sales target, and two more differences are still open. The report rewrote the difference for the
 * lead as "You and the team ...", and the clause was put after "In "label", " with its capital kept. A clause after a comma starts in lower
 * case unless it starts with a name.
 */
const REPORT = {
  whereThingsStand: {
    settled: [{}, {}, {}],
    differences: [
      'You and the team are not aligned on how to measure progress toward the main sales target.',
      'Whether a sale counts before there is a payment',
      'Who follows up with Juja Hardware',
    ],
  },
};

describe('"you" is lower case inside a subject', () => {
  it('Grace\'s subject on Wednesday 14 October', () => {
    expect(theFirstInsight(REPORT, 'Sales team, Q4', { isTheLead: true })!.subjectForTheLead)
      .toBe('In "Sales team, Q4", you and the team are not aligned on how to measure progress toward the main sales target, and two more differences are still open');
  });
  it('and the same clause wherever it follows "In "X","', () => {
    expect(theFirstOpenDifference(REPORT)).toBe('you and the team are not aligned on how to measure progress toward the main sales target');
  });
  it('a name keeps its capital', () => {
    expect(theFirstOpenDifference({ whereThingsStand: { differences: ['Joseph and Grace are not aligned on the price for Juja Hardware, which the team needs settled before Friday.'] } }))
      .toMatch(/^Joseph and Grace/);
  });
});
