/**
 * A REPORT THAT SYNTHESISES AND MARKS NOTHING IS NOT REPORTING ITS OWN UNCERTAINTY.
 *
 * Rule 6 asks the model to list every claim it concluded rather than one a participant stated.
 * Measured on the live database, ten of twelve reports came back with an empty inferences array -
 * while their own bodies said things like "the current process is seen by both as likely to yield
 * four renewals this quarter", which nobody wrote. The mechanism existed and was dead.
 *
 * The old definition asked whether a claim was "a direct quote from the record", which is a hard
 * question to answer about a sentence you have just written in your own words - and the model
 * answered it by marking nothing. The definition now asks something a writer can actually check:
 * did a participant say this, or did I work it out. This is the check that an answer is given.
 *
 * A CORRECTION TO THE FIRST VERSION OF THIS FILE. It said rule 1 forbids quoting anyone, and used
 * that to argue the old definition was self-contradictory. Rule 1 is PRESERVE SPECIFICS VERBATIM -
 * the opposite. The never-quote rules belong to the post-report guide, and inside the synthesis
 * they are scoped to leadership gaps and to lead-supplied context, not to the report at large. The
 * empty arrays are real and measured; that explanation of them was not.
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
