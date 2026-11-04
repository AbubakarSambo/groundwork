/**
 * A DAY IS NOT A TARGET (local test of staging, 15 October).
 *
 * Muchemi & Co's lead said "Matter A defence filed on time on 22 October", and the aim was kept as "Hafsah is aiming for
 * the Matter A defence to be filed on time on 22 October." with the target 22, because 22 is a number she said. It is the
 * day, not a count of anything: the board would have read it as 0 of 22. A number that appears in the aim's own words only
 * as part of a date (a day of a month, a year, or a date written with slashes) is not its target. A number that also
 * appears as a count ("file 3 defences by 22 October" keeps 3) is unaffected, and so is one the words do not hold at all.
 */
const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const DATES = [
  new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH}\\b(?:,?\\s+\\d{4})?`, 'gi'),
  new RegExp(`\\b${MONTH}\\s+\\d{1,2}(?:st|nd|rd|th)?\\b(?:,?\\s+\\d{4})?`, 'gi'),
  /\b\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?\b/g,
  /\b(?:19|20)\d{2}\b/g,
];

function figuresIn(text: string): { n: number; at: number; end: number }[] {
  const out: { n: number; at: number; end: number }[] = [];
  for (const m of text.matchAll(/\d{1,3}(?:,\d{3})+|\d+/g)) {
    out.push({ n: Number(m[0].replace(/,/g, '')), at: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
  }
  return out;
}

/** Where the dates are in these words, as [start, end) spans. */
export function theDatesIn(words: string | null | undefined): [number, number][] {
  const said = String(words ?? '');
  const spans: [number, number][] = [];
  for (const re of DATES) for (const m of said.matchAll(re)) spans.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
  return spans;
}

/** True when the target appears in these words, and only ever inside a date. */
export function theNumberIsOnlyADay(words: string | null | undefined, target: number | null | undefined): boolean {
  const said = String(words ?? '');
  if (target == null || !Number.isFinite(target) || !said) return false;
  const spans = theDatesIn(said);
  const theirs = figuresIn(said).filter((f) => f.n === target);
  if (!theirs.length) return false;
  return theirs.every((f) => spans.some(([a, b]) => f.at >= a && f.end <= b));
}

/** The aim, with a target that is only a day in its own words taken off. */
export function aDayIsNotATarget<T extends { name: string; target: number | null }>(aim: T): T {
  return theNumberIsOnlyADay(aim.name, aim.target) ? { ...aim, target: null } : aim;
}
