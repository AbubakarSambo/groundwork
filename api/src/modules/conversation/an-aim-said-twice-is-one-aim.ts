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

/** The fresh aims worth writing, with any restatement of an existing one left out. */
export function theAimsThatAreNew(fresh: AnAim[], existing: AnAim[]): AnAim[] {
  const already = new Set(existing.map((o) => (o.name ?? '').trim().toLowerCase()));
  const kept: AnAim[] = [];
  for (const aim of fresh) {
    if (already.has((aim.name ?? '').trim().toLowerCase())) continue;
    if (isTheSameAimSaidAsItsNumber(aim, [...existing, ...kept])) continue;
    kept.push(aim);
  }
  return kept;
}
