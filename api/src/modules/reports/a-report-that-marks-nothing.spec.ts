import { doesThisReportMarkItsInferences } from './a-report-that-marks-nothing';

/**
 * TEN OF TWELVE REPORTS MARKED NOTHING.
 *
 * Counted on the live database. The mechanism for saying which claims the model concluded existed,
 * was described in the schema, had a review panel built for it, and was empty almost everywhere -
 * while the bodies of those same reports said things like "the current process is seen by both as
 * likely to yield four renewals this quarter", which no participant wrote.
 *
 * The old definition is why: an inference was "any claim that is not a direct quote", and rule 1
 * forbids quoting anyone at all. Followed honestly that makes every sentence an inference; followed
 * loosely it makes none. Both are useless to a reader. The definition now turns on whether a
 * participant actually said the thing.
 *
 * This is the check that an answer is being given. It warns rather than refuses, because a short
 * check-in that only restates one person's own words genuinely has nothing to mark, and losing a
 * real report to a heuristic is worse than logging a suspicion.
 */
const SYNTHESIS = 'x'.repeat(420);

describe('a report that marks nothing', () => {
  it('says nothing is wrong when the report marked something', () => {
    const r = doesThisReportMarkItsInferences(
      { sharedPicture: SYNTHESIS, agreements: [1], divergences: [1] },
      [{ id: 'i1' }],
    );
    expect(r.looksUnmarked).toBe(false);
  });

  it('flags a full report that marked nothing - the ten-of-twelve case', () => {
    const r = doesThisReportMarkItsInferences(
      { sharedPicture: SYNTHESIS, agreements: [1, 2], divergences: [1] },
      [],
    );
    expect(r.looksUnmarked).toBe(true);
    expect(r.why).toContain('not one claim');
  });

  it('does not flag a short report, which may honestly have nothing to mark', () => {
    const r = doesThisReportMarkItsInferences(
      { sharedPicture: 'Both said the same thing.', agreements: [1], divergences: [] },
      [],
    );
    expect(r.looksUnmarked).toBe(false);
  });

  it('does not flag a long report with no findings in it yet', () => {
    /* Prose without findings is a forming report, not a synthesis that skipped its own labelling. */
    const r = doesThisReportMarkItsInferences(
      { sharedPicture: SYNTHESIS, agreements: [], divergences: [] },
      [],
    );
    expect(r.looksUnmarked).toBe(false);
  });

  it('survives a report with nothing in it at all', () => {
    expect(doesThisReportMarkItsInferences({}, []).looksUnmarked).toBe(false);
  });
});
