/**
 * FOUR CHECK-INS CALLED "THE GOAL IS TO BETTER UN…".
 *
 * Read in the left rail on 23 September 2026: four separate check-ins, indistinguishable, because
 * each label is the opening words of a brief and she had run the same brief four times while
 * testing. There is no way to tell which one you are opening, and the rail truncates at the point
 * where they would start to differ anyway.
 *
 * WHY NOT "(2)". A number says the product has two of something. It does not help anybody find the
 * one they want. The date it opened does: "the one I ran on Tuesday" is how people actually refer
 * to them, and it is true, short, and never wrong.
 *
 * WHY NOT RENAME THE OLD ONE. Somebody may have the old one open, linked or bookmarked, and a
 * label that changes under them is worse than two that match. The new one takes the suffix.
 */

/** Day and month in the short form the rest of the product uses. */
function theDay(when: Date): string {
  return when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' });
}

/**
 * A label nobody will confuse with one they already have.
 *
 * `taken` is the labels already in this organisation. Comparison ignores case and punctuation, so
 * "The goal is to better understand" and "the goal is to better understand." are the same label.
 */
export function aLabelTheyCanTellApart(label: string, taken: string[], when: Date = new Date()): string {
  const wanted = (label ?? '').trim();
  if (!wanted) return wanted;
  const bones = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const clash = (taken ?? []).some((t) => bones(t) === bones(wanted));
  if (!clash) return wanted;
  const withDay = `${wanted} · ${theDay(when)}`;
  /* Two on the same day. The second gets the day too, and the rail then shows them in the order
     they were opened - which is the only thing left that distinguishes them honestly. */
  return withDay;
}
