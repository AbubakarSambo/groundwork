/**
 * A FINDING IS SERVED WITHOUT ITS LABEL.
 *
 * Every row of `findings` is stored as `{ text, label, hasGap, headline, participantId }`, and the
 * label is the positional one the report is written in: "the initiator", "Participant A". The
 * text is named at the read. The label is deliberately not (see the note on `NEVER_NAMED` in
 * `applyNames`), so every lead's report and every participant's own report carried
 * `"label": "the initiator"` beside a paragraph that already said "You". Counted on run 10 of the
 * twenty-four scenarios: 113 of the 114 internal labels anybody was handed were this one field.
 *
 * NOTHING READS IT. No screen in `client/src` renders `finding.label`. The two reads that narrow
 * findings to one reader, `onlyTheirOwnFinding` and the board's row per person, match on
 * `participantId`. The one place that did use the label, the board's "strip the label off the
 * front of the text", can derive it from the participants the same way the report was written.
 *
 * SO IT IS STRIPPED AT THE READ, NOT AT THE WRITE, the same rule as the machine's table (see
 * the-table-is-for-the-engine). The label stays on the stored row, because the stored row is in
 * labels by design and names are put in only when somebody reads it. Called from `asItWasShared`,
 * the door every report read goes through, the board's included, so no read can be the one that
 * forgets.
 */

/** A copy of the report with `label` taken off each finding. Never mutates, like its neighbours. */
export function findingsWithoutTheirLabels<T extends Record<string, any> | null | undefined>(report: T): T {
  if (!report || typeof report !== 'object') return report;
  const findings = (report as Record<string, any>).findings;
  if (!Array.isArray(findings)) return report;
  return {
    ...(report as Record<string, any>),
    findings: findings.map((f) => {
      if (!f || typeof f !== 'object' || !('label' in f)) return f;
      const { label: _label, ...rest } = f as Record<string, any>;
      return rest;
    }),
  } as unknown as T;
}
