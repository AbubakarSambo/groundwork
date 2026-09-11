/**
 * A LINE SOMEBODY DISPUTED STAYS IN THE REPORT. IT STOPS COUNTING; IT DOES NOT DISAPPEAR.
 *
 * The schema says of a disputed row that it "stays on the record and stops counting toward every
 * read". Counting and showing had been collapsed into one: every read filtered `disputedAt: null`,
 * so a line the person it is about had objected to simply vanished, and the objection vanished with
 * it. The reader sees a picture with a hole in it and no idea a hole is there.
 *
 * That is the opposite of what a dispute is for. Somebody took the trouble to say "that is not what
 * happened". Deleting the claim deletes their answer to it too, and leaves the disagreement
 * unresolved and invisible instead of unresolved and visible.
 *
 * WHERE THE OLD BEHAVIOUR IS RIGHT AND STAYS. Anywhere the row is being COUNTED - percentages,
 * shares, document-backed ratios, keyword sweeps, contribution comparisons - a disputed row is
 * excluded, exactly as the schema comment says. Arithmetic built on a contested claim is a number
 * that asserts what nobody agreed. Those reads keep their filter.
 *
 * WHERE IT CHANGES. The synthesis read, which is what the report is written from. A disputed line
 * reaches the model with the dispute attached to it in the same string, so the report can say the
 * two accounts differ rather than quietly picking one. Neither overrules the other.
 */
export type MaybeDisputed = {
  text: string;
  disputedAt?: Date | null;
  disputeNote?: string | null;
};

export const A_DISPUTED_LINE = 'The person this is about says it did not happen this way';

/**
 * The line as the synthesis should read it: the claim, then the objection, in one string so nothing
 * downstream can carry the one without the other.
 */
export function withTheDisputeAttached<T extends MaybeDisputed>(row: T): T {
  if (!row.disputedAt) return row;
  const theirAnswer = (row.disputeNote ?? '').trim();
  const said = theirAnswer ? `${A_DISPUTED_LINE}: ${theirAnswer}` : `${A_DISPUTED_LINE}.`;
  return { ...row, text: `${row.text} [${said}]` };
}

/** The rule for the synthesis prompt, so the model knows what the bracket means. */
export const HOW_TO_READ_A_DISPUTED_LINE = `
A line may arrive with a bracket at the end saying the person it is about disputes it. Both halves
are on the record and neither overrules the other. Do not drop the line, do not pick a side, and do
not treat the dispute as a correction. Where a disputed line matters to the picture, say plainly that
the two accounts differ on it. Never count a disputed line as evidence for anything.`.trim();
