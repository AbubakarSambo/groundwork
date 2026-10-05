/**
 * "THAT IS NOT WHAT I SAID", FOR AN AGREEMENT.
 *
 * The record has had this press since nine model extractors started writing rows into it. A term
 * read out of a document by a model, and an understanding taken off a transcript by one, are the
 * same kind of object and had no equivalent - so a person shown a reading they never gave had
 * nowhere to say so, on the one surface where being held to words you did not say costs money.
 *
 * IT MARKS, IT NEVER DELETES, which is the rule everywhere else and matters more here. The row is
 * the evidence that the read was made, and a table that quietly loses its mistakes cannot be
 * audited for them - which on a contract is the question somebody eventually asks.
 *
 * TWO THINGS CAN BE UNSAID AND THEY ARE NOT THE SAME.
 *
 * A whole term: "that is not a clause in this document", or "that is not what it says". The row
 * stops counting toward anything.
 *
 * One person's understanding of a term everybody else still reads normally: they take their own
 * half back. Nobody else's reading is touched, and the term returns to whatever it was before they
 * spoke - which is usually read-from-the-document, meaning nobody has checked it, which is true.
 */

export interface Reading {
  by: string;
  reads: string;
  /** When they took it back. Present means it counts toward nothing from that moment. */
  unsaidAt?: string | null;
}

/** The readings that still stand. Order is kept: it is the order they were given in. */
export function readingsThatStand(raw: unknown): Reading[] {
  const rows = Array.isArray(raw) ? (raw as Reading[]) : [];
  return rows.filter((r) => r && typeof r.by === 'string' && typeof r.reads === 'string' && !r.unsaidAt);
}

/**
 * Mark one person's reading as taken back, leaving every other one exactly as it was.
 *
 * Returns null when they had no standing reading to take back, so a caller can say that rather than
 * writing an unchanged row and reporting success.
 */
export function takeBackTheirReading(raw: unknown, who: string, at = new Date()): Reading[] | null {
  const rows = Array.isArray(raw) ? (raw as Reading[]) : [];
  let found = false;
  const out = rows.map((r) => {
    if (!found && r?.by === who && !r.unsaidAt) {
      found = true;
      return { ...r, unsaidAt: at.toISOString() };
    }
    return r;
  });
  return found ? out : null;
}

/**
 * WHAT A TERM'S STATE BECOMES WHEN A READING IS TAKEN BACK.
 *
 * Two standing readings is still a difference between two sides. One or none is not, and leaving
 * the term marked as read-differently would keep a disagreement on screen that one of the two
 * people in it has withdrawn from - which is worse than never having recorded it.
 *
 * It does not go to "checked by one side", because the remaining reading is where the term already
 * was rather than somebody newly confirming it. Read from the document, checked by nobody, is the
 * honest place to land.
 */
export function theStateAfterwards(standing: Reading[], checkedBy: string[]): string {
  if (standing.length >= 2) return 'read differently by each side';
  return checkedBy.length >= 2 ? 'agreed by both'
    : checkedBy.length === 1 ? 'checked by one side'
      : 'read from the document';
}

/** What the person is told, in the same voice as the record's own press. */
export function sayItIsTakenBack(what: 'term' | 'reading'): string {
  return what === 'term'
    ? 'This is taken off, and it no longer counts toward anything. It stays on the record, marked wrong.'
    : 'Taken back. Nobody else\'s reading changed, and this one stays on the record as given and withdrawn.';
}
