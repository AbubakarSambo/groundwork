/**
 * "UNITS OF TEA SOLD IN ABUJA (10,000)" AND "10,000 UNITS (10,000)", ON THE SAME BOARD.
 *
 * Read on screen, in the band at the top of a participant's check-in:
 *
 *   The objectives on record:
 *   - units of tea sold in Abuja (10,000)
 *   - 10,000 units (10,000)
 *
 * One aim, twice, because the extraction ran on two different sentences and the dedupe matches the
 * NAME exactly. "10,000 units" is not another objective; it is the same objective with the number
 * used as its name. The person reading that band has to work out which of the two they are being
 * asked about, and the arithmetic that adds the parts up against the whole now has two wholes.
 *
 * THE TEST IS DELIBERATELY NARROW. A fresh aim is the same aim only when it carries the same number
 * AND its name is that number plus a unit word - nothing left once the figure and the unit come
 * out. "Ten shops opened (10)" next to "units sold (10)" share a number and nothing else, and both
 * stand. Anything less obvious than a restatement is two aims, and two aims are cheap to merge by
 * hand while a wrongly dropped one is invisible.
 */

/** What a name says once the number and the unit it counts are taken out of it. */
const WHAT_IS_LEFT = (name: string): string =>
  (name ?? '')
    .toLowerCase()
    /* "N180m", "₦180m", "NGN 180m": the currency is part of the figure. Six near-copies of one target
       sat on a sales board because "n180m" survived the strip as a word (adversarial run, 20 Sep 2026). */
    .replace(/[₦$£€]/g, ' ')
    .replace(/\b(ngn|naira|usd|gbp|eur|n)(?=\s*\d)/g, ' ')
    .replace(/\b\d[\d,.]*\s*(k|m|bn|million|thousand)?\b/g, ' ')
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|thousand|million)\b/g, ' ')
    .replace(/\b(units?|items?|things?|pieces?|bags?|boxes?|cases?|sales?|total|in total|overall|target|goal|objective|of|the|a|an|for|this|our|team|company|year|month|week|quarter|q[1-4]|period)\b/g, ' ')
    .replace(/[^a-z]+/g, ' ')
    .trim();

export interface AnAim {
  name: string;
  target: number | null;
}

/** Is this fresh aim one of the existing ones, said as its own number? */
export function isTheSameAimSaidAsItsNumber(fresh: AnAim, existing: AnAim[]): boolean {
  if (fresh.target == null) return false;
  /* Something of its own left in the name means it is about something of its own. */
  if (WHAT_IS_LEFT(fresh.name).length > 0) return false;
  return existing.some((e) => e.target === fresh.target);
}

/**
 * THE SAME FIGURE, WORDED FOUR WAYS. Rerun, 20 Sep 2026, one lead, one board: "Securing new business
 * for the firm (400,000)", "new business (400,000)", "Drive revenue of around $400,000, weighted
 * towards larger engagements (400,000)", "Generate $400,000 in new business (400,000)". Each
 * extraction wrote the same target under the sentence it happened to read it from.
 *
 * A figure said twice is the same aim when one name is the other with words added: everything left
 * in the shorter name, once the number and the filler are out, is in the longer one. "new business"
 * is inside "securing new business for the firm". "Units of tea sold in Kaduna" is NOT inside "units
 * of tea sold in Abuja" - the place is the difference - and "shops opened in Kano" shares nothing
 * with "wholesale accounts signed", so both of those stay two aims, for the reason at the top of
 * this file: a wrongly dropped aim is invisible.
 */
const wordsOf = (name: string): Set<string> => new Set(WHAT_IS_LEFT(name).split(/\s+/).filter((w) => w.length > 2));

/* A sum of money said twice is one aim: nobody has two different objectives of exactly $400,000, and "Bring
   in $400k of new business" next to "Achieve the $400k new business goal" was still two (run 6, 20 Sep 2026).
   Counts stay on the subset rule: 10,000 shops opened and 10,000 accounts signed are two things. */
const A_SUM_OF_MONEY = 100_000;

export function isTheSameFigureWordedAgain(fresh: AnAim, existing: AnAim[]): boolean {
  if (fresh.target == null) return false;
  const mine = wordsOf(fresh.name);
  return existing.some((e) => {
    if (e.target !== fresh.target) return false;
    if (Math.abs(fresh.target as number) >= A_SUM_OF_MONEY) return true;
    const theirs = wordsOf(e.name);
    const [shorter, longer] = mine.size <= theirs.size ? [mine, theirs] : [theirs, mine];
    return shorter.size > 0 && [...shorter].every((w) => longer.has(w));
  });
}

/* "get to N180m" arrived with no target, beside "Hit N180m (180,000,000)", and the About box listed both
   (run 7, 21 Sep 2026). The figure in the name is the target it did not carry. */
const SCALE: Record<string, number> = { k: 1e3, m: 1e6, mn: 1e6, bn: 1e9, thousand: 1e3, million: 1e6, billion: 1e9 };
export function theFigureInTheName(name: string | null | undefined): number | null {
  const m = /(?<![\d.])(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(k|m|mn|bn|thousand|million|billion)?\b/i.exec(name ?? '');
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, '')) * (SCALE[(m[2] ?? '').toLowerCase()] ?? 1);
  return Number.isFinite(n) && n >= 10 ? n : null;
}

/** The fresh aims worth writing, with any restatement of an existing one left out. */
export function theAimsThatAreNew(fresh: AnAim[], existing: AnAim[]): AnAim[] {
  const already = new Set(existing.map((o) => (o.name ?? '').trim().toLowerCase()));
  const kept: AnAim[] = [];
  for (const aim of fresh) {
    if (already.has((aim.name ?? '').trim().toLowerCase())) continue;
    const withFigure = aim.target == null && theFigureInTheName(aim.name) != null ? { ...aim, target: theFigureInTheName(aim.name) } : aim;
    if (isTheSameAimSaidAsItsNumber(withFigure, [...existing, ...kept])) continue;
    if (isTheSameFigureWordedAgain(withFigure, [...existing, ...kept])) continue;
    kept.push(aim);
  }
  return kept;
}
