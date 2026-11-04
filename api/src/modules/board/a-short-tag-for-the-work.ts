/**
 * A SHORT TAG FOR WHAT ONE PERSON'S WORK SHOWS, FROM A PATTERN ON RECORD (screen match; board-as-lead.txt, "The team today":
 * Brian "Many visits, few moves", David "Visits without names").
 *
 * On a sales board, two of the patterns the engine already finds and serves to whoever runs the check-in say something
 * about the visits themselves: heavy communication with no blocker cleared (B5) is, on a sales floor, many visits that
 * move no deal; tasks described without what they are for (K5) is visits logged without the customer's name. The tag is
 * about the work, never a word about the person, and is read only from a pattern this reader is already served: the
 * caller passes the patterns as served, and the codes are looked up for those rows alone. The code itself goes nowhere.
 */
export const A_SALES_TAG_FOR_THE_PATTERN: Record<string, string> = {
  B5: 'Many visits, few moves',
  K5: 'Visits without names',
};

/** The first tag any of this person's served patterns gives, in the order they were served, or null. */
export function aShortTagForTheWork(codesInOrder: string[]): string | null {
  for (const c of codesInOrder) if (A_SALES_TAG_FOR_THE_PATTERN[c]) return A_SALES_TAG_FOR_THE_PATTERN[c];
  return null;
}
