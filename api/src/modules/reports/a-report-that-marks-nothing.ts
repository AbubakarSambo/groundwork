/**
 * A REPORT THAT SYNTHESISES AND MARKS NOTHING IS NOT REPORTING ITS OWN UNCERTAINTY.
 *
 * Rule 6 asks the model to list every claim it concluded rather than one a participant stated.
 * Measured on the live database, ten of twelve reports came back with an empty inferences array -
 * while their own bodies said things like "the current process is seen by both as likely to yield
 * four renewals this quarter", which nobody wrote. The mechanism existed and was dead.
 *
 * The old definition is why. It said an inference was anything that was "not a direct quote", and
 * rule 1 forbids quoting anybody at all - so the honest answer was "everything", which is as
 * useless to a reader as "nothing". The definition now turns on whether a participant actually
 * said it. This is the check that the answer is being given at all.
 *
 * IT IS DELIBERATELY NOT A HARD FAILURE. A report that marks nothing may be correct - a single
 * short check-in where the model only restates what one person wrote genuinely has no inferences.
 * Refusing to store it would lose a real report over a heuristic. It is logged loudly instead, so
 * an empty array stops being invisible.
 */
export type InferenceCheck = {
  looksUnmarked: boolean;
  why: string;
};

/**
 * The signal is length, not cleverness. Synthesis prose across several sections is where claims
 * nobody made get made; a two-line report is where they do not.
 */
const ENOUGH_PROSE_TO_EXPECT_ONE = 400;

export function doesThisReportMarkItsInferences(
  report: { sharedPicture?: string | null; agreements?: unknown; divergences?: unknown },
  inferences: unknown[],
): InferenceCheck {
  if (inferences.length > 0) {
    return { looksUnmarked: false, why: `${inferences.length} marked` };
  }

  const prose = (report.sharedPicture ?? '').trim();
  const sections =
    (Array.isArray(report.agreements) ? report.agreements.length : 0) +
    (Array.isArray(report.divergences) ? report.divergences.length : 0);

  if (prose.length >= ENOUGH_PROSE_TO_EXPECT_ONE && sections > 0) {
    return {
      looksUnmarked: true,
      why:
        `${prose.length} characters of shared picture and ${sections} findings, and not one claim ` +
        `marked as concluded. Either every claim traces to something a participant said, or rule 6 ` +
        `was skipped.`,
    };
  }
  return { looksUnmarked: false, why: 'too short to expect one' };
}
