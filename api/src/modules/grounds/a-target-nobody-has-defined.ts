/**
 * A TARGET WHOSE DEFINITION IS DISPUTED, SAID WHEREVER IT IS REPORTED AGAINST.
 *
 * Hafsah, 22 September 2026: "signed 12m" sat on the board as a settled number while her own note,
 * a page away, said nobody had agreed whether the 12m is signed or recognised revenue, and that
 * finance counts collection where sales counts booked. Both facts were in the product. Only one of
 * them was anywhere near the number.
 *
 * A reader cannot see the difference between a number somebody agreed and a number somebody typed,
 * so the number has to carry it. This does not hide, block or change the target: it says, next to
 * it, the lead's own sentence about what is not settled.
 */
const wordsOf = (t: string): string[] =>
  (t ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3);

/*
 * HOW A BIG NUMBER IS WRITTEN IN A SENTENCE: 12000000 is "12m" to everybody who says it out loud.
 *
 * BIG ONLY, AND ON A WORD BOUNDARY. The first version matched any digits anywhere, and the board
 * read live on 22 September 2026: "new paying customers = 6" carried a note about "only 6 are real"
 * (Sarah's pipeline), "expansions = 4" carried one about "a Q4 target of 15m" - the 4 of "Q4" - and
 * "warm referrals = 2" matched the 2 inside "12m". Five of seven targets were flagged by a digit
 * that had nothing to do with them, which is worse than not flagging any: a warning that fires
 * everywhere says nothing anywhere.
 *
 * A target of 6 or 4 cannot be identified by its digits in prose, so it is identified by its words
 * or not at all.
 */
const A_NUMBER_BIG_ENOUGH_TO_NAME = 1000;
const asWritten = (n: number | null | undefined): string[] => {
  if (n == null || Math.abs(n) < A_NUMBER_BIG_ENOUGH_TO_NAME) return [];
  const out = [String(n), n.toLocaleString('en-GB')];
  if (Math.abs(n) >= 1e6) out.push(`${+(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}m`);
  out.push(`${+(n / 1e3).toFixed(n % 1e3 ? 1 : 0)}k`);
  return out;
};

/* On a boundary, so "2" never matches inside "12m" and "12m" never matches inside "112m". */
const saysThisNumber = (said: string, form: string): boolean =>
  new RegExp(`(?:^|[^a-z0-9.,])${form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^a-z0-9])`, 'i').test(said);

/**
 * The lead's own line about why this target is not settled, or null.
 *
 * Matched on the measure's words or on its number as a person would write it, so "the 12m may be
 * signed or recognised" reaches the target called "signed" that holds 12,000,000.
 */
export function whatIsNotSettledAbout(
  target: { name: string; target?: number | null },
  lines: string[] | null | undefined,
): string | null {
  const name = wordsOf(target.name);
  const numbers = asWritten(target.target).map((f) => f.toLowerCase());
  for (const raw of lines ?? []) {
    const line = (raw ?? '').trim();
    if (!line) continue;
    const said = line.toLowerCase();
    if (name.length && name.every((w) => said.includes(w))) return line;
    if (numbers.some((f) => saysThisNumber(said, f))) return line;
  }
  return null;
}

/** The lines under a "not settled" note, which is how that note is written. */
export function theLinesUnder(noteText: string | null | undefined): string[] {
  return (noteText ?? '')
    .split('\n')
    .slice(1)
    .map((l) => l.replace(/^[-\s]+/, '').trim())
    .filter(Boolean);
}
