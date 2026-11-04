import { theFirstInsight, theFirstOpenDifference, theFindingOnItsOwn } from './the-first-insight';
import { A_LINE_WE_COULD_NOT_RESTATE } from '../reports/said-in-its-own-words';

/**
 * Wanjiru's shared-picture email for "Litigation team daily", Wednesday 14 October, 14:06, engine test, second run. Its subject read
 * 'The shared picture for "Litigation team daily" found two differences still open' and its first line read "[One line here repeated
 * somebody's exact words closely enough to identify them, and could not be restated. Nothing was removed from the record: it is in their
 * own session.], and one more difference is still open." The other difference is the one that picture's report held.
 */
const OTHER = 'The current status of the legal reply for the Kasarani Foods case.';
const report = (differences: string[]) => ({
  whereThingsStand: {
    settled: ['a', 'b', 'c'],
    differences,
    openWithReasons: [
      { topic: A_LINE_WE_COULD_NOT_RESTATE, settledBy: 'Agree on who is the single point of contact for securing the witness statements from the client.' },
      { topic: OTHER, settledBy: "Review the court's e-filing portal to confirm the filing status." },
    ].filter((r) => differences.includes(r.topic)),
  },
});

describe("Wanjiru's shared-picture email when one difference could not be restated", () => {
  const insight = theFirstInsight(report([A_LINE_WE_COULD_NOT_RESTATE, OTHER]), 'Litigation team daily', { isTheLead: true })!;

  it('opens with the difference that can be named, and still counts both', () => {
    expect(insight.lines[0]).toBe('The people in "Litigation team daily" differ on "The current status of the legal reply for the Kasarani Foods case", and one more difference is still open.');
    expect(insight.lines.join(' ')).not.toContain('[');
    expect(insight.lines.join(' ')).not.toContain('settled');
  });

  it("says what would settle the one it names, not the stand-in's", () => {
    expect(insight.lines).toContain("Here is what I would do first. Review the court's e-filing portal to confirm the filing status.");
  });

  it('never puts the stand-in in the subject', () => {
    expect(insight.subjectForTheLead).not.toContain('[');
  });

  it('with only the stand-in open, says how many the picture found', () => {
    const only = theFirstInsight(report([A_LINE_WE_COULD_NOT_RESTATE]), 'Litigation team daily', { isTheLead: true })!;
    expect(only.lines[0]).toBe('The report for "Litigation team daily" found one difference still open.');
    expect(only.subjectForTheLead).toBe('The report for "Litigation team daily" found one difference still open');
    expect(only.lines.join(' ')).not.toContain('[');
    expect(theFirstOpenDifference(report([A_LINE_WE_COULD_NOT_RESTATE]))).toBeNull();
    expect(theFindingOnItsOwn(report([A_LINE_WE_COULD_NOT_RESTATE]), 'Litigation team daily')).toBeNull();
  });
});
