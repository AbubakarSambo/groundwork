/**
 * THE MACHINE'S TABLE IS FOR THE MACHINE. NOBODY READS IT.
 *
 * `theTable` is the counting sheet the judgement is computed from, and it is handed to the model as
 * the only thing it may use. It is working, not writing. It looks like this:
 *
 *   FIELD: What is holding up approvals?
 *     standing: THIN - only 1 people answered, which is too few to rank
 *     asked 4 · answered 3 · said they cannot 0 · never reached 1
 *       2   67%  the credit committee
 *     by kind - blocker: the credit committee (2), bank statements (1)
 *
 * Every rule this product has about what a person reads is broken in those five lines at once:
 * capital-letter slot names, an arrow of counts joined with dots and middle dots, a sentence that
 * starts in lower case, "1 people", and a standing on a person's answers - which a lead may never
 * see, because how somebody's answers were rated is not theirs to read.
 *
 * It was being served anyway. `theTable` is a column on the report row, `asItWasShared` spreads
 * that row, and the board asked for it by name - so a participant was protected from it by the
 * denylist in `the-judgement-is-the-leads`, and the LEAD, who is protected from nothing, got all of
 * it on both their report and their board. Measured across the twenty-four scenarios: 800 machine
 * table words, 400 in the lead's report and 400 on the lead's board, and none anywhere else. 106 of
 * the 107 remaining lower-case sentence starts were inside it too.
 *
 * SO IT IS STRIPPED AT THE READ, NOT AT THE WRITE. It is still computed and still stored, because
 * it is the evidence behind the judgement and the thing to look at when a judgement is wrong. What
 * changes is that no reader is ever handed it.
 *
 * ONE FUNCTION, TWO CALLERS, AND THAT IS THE POINT. `asItWasShared` is the door every report read
 * goes through - including the board's, which routes the whole row through it - and
 * `theBoardsJudgementFor` is the one place that reaches for this field by name. Both ask this, so
 * neither can be the one that forgets.
 */

/** The field, named once, so a grep for it finds this file. */
export const THE_MACHINES_TABLE = 'theTable' as const;

/**
 * The report row with the machine's table taken out of it.
 *
 * Returns a new object and never mutates: the same assembled row is handed to the board and to the
 * report in one request on at least one path, and a shared object one caller has emptied is a bug
 * nobody finds for a month. Same reason `whatAParticipantMayRead` copies.
 */
export function theTableStaysWithTheEngine<T extends Record<string, any> | null | undefined>(report: T): T {
  if (!report || typeof report !== 'object') return report;
  if (!(THE_MACHINES_TABLE in report)) return report;
  const out: Record<string, any> = { ...(report as Record<string, any>) };
  delete out[THE_MACHINES_TABLE];
  return out as T;
}
