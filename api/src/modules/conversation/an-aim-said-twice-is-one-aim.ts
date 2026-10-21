import { theDatesIn } from './a-day-is-not-a-target';
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
    /*
     * AND THE VERB AN AIM IS PHRASED WITH IS NOT WHAT IT IS ABOUT.
     *
     * Live board, 24 September 2026, two objectives, both with no owner and no number:
     *   - Get the federal ministry MOU for the market information programme
     *   - Secure the federal ministry MOU for the market information programme
     * One aim, read twice, out of two turns of the same conversation. The subset rule could not
     * merge them because each name held one word the other did not, and that word was the verb.
     * Every one of these is a way of saying "make this happen", carries nothing about WHICH thing,
     * and taking them out leaves exactly the thing: "federal ministry mou market information
     * programme", identical on both.
     */
    .replace(/\b(get|getting|secure|securing|obtain|obtaining|achieve|achieving|deliver|delivering|reach|reaching|complete|completing|finish|finishing|close|closing|win|winning|sign|signing|land|landing|bring|bringing|drive|driving|generate|generating|build|building|set up|setting up|make|making|move|moving|ensure|ensuring|establish|establishing)\b/g, ' ')
    /*
     * AND WHO WANTS IT, AND BY WHEN, ARE NOT WHAT IT IS ABOUT (screens requests 109 b and 111 b). One sales
     * board listed one aim three times: "Sign 12 shops for kitchen appliances in Nairobi.", "I want us to sign
     * 12 shops by 20 December." and "They want to get 12 shops onboarded.". Each said 12 shops; what kept
     * them apart was "want", "December" and "onboarded", none of which says WHICH shops. Taken out, each is
     * "shops", inside the first one's name, and the figure is the same: one aim.
     */
    .replace(/\b(i|we|us|you|they|he|she|it|me|my|our|your|their|his|her|want|wants|wanted|wanting|would|like|aim|aims|aiming|hope|hoping|plan|plans|planning|intend|need|needs|to|by|be|is|are|am|was|were|will|shall|should|must|have|has|had|end|start)\b/g, ' ')
    .replace(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec|monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|next)\b/g, ' ')
    .replace(/\b(onboard|onboarded|onboarding|signed|closed|sold|won|got|done|achieved|reached|delivered|completed)\b/g, ' ')
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
  /* The first figure that is not part of a date: "filed on time on 22 October" holds a day, not 22 of anything (local test of staging, 15 October). */
  const dates = theDatesIn(name);
  const re = /(?<![\d.])(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(k|m|mn|bn|thousand|million|billion)?\b/gi;
  let m: RegExpExecArray | null = null;
  for (let x = re.exec(name ?? ''); x; x = re.exec(name ?? '')) {
    const at = x.index ?? 0;
    const end = at + x[1].length;
    if (!dates.some(([a, b]) => at >= a && end <= b)) { m = x; break; }
  }
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, '')) * (SCALE[(m[2] ?? '').toLowerCase()] ?? 1);
  /* A RATE IS A TARGET AT ANY SIZE. "under 8% arrears" sat on a sales board with no number, and the
     board read "0 so far" against it while the lead was saying "arrears are at 14%" (run 11, 22 Sep
     2026). Eight is small for a count and exactly right for a percentage. */
  const aRate = /^\s*(%|percent|per cent|pc\b)/i.test((name ?? '').slice((m.index ?? 0) + m[0].length));
  return Number.isFinite(n) && (n >= 10 || (aRate && n > 0)) ? n : null;
}

/*
 * A NAME WITH NO NUMBER AND NO WORDS OF ITS OWN IS A RESTATEMENT. Run 11's sales board, session 3:
 * "35% credit limit", "under 8% arrears" and "Sales reaching N180m" were joined by "credit limit",
 * "arrears target" and "sales target", each with no number - the lead restating her three aims in a
 * later session, written as three more. A fresh aim without a figure whose words, once the filler is
 * out, all sit inside an existing aim's name is that aim said again. "Shops opened in Kano" is not
 * inside "wholesale accounts signed", and stays.
 */
export function isAnExistingAimRestatedWithoutItsNumber(fresh: AnAim, existing: AnAim[]): boolean {
  if (fresh.target != null) return false;
  const mine = wordsOf(fresh.name);
  if (mine.size === 0) return existing.length > 0;
  return existing.some((e) => {
    const theirs = wordsOf(e.name);
    return theirs.size > 0 && [...mine].every((w) => theirs.has(w));
  });
}

/** The fresh aims worth writing, with any restatement of an existing one left out. */
/**
 * @param theySaid whether the person said a figure, at any scale. The figure in a name is kept as the
 *   target only where they did: "N50m in sales" was the model's reading of a man who said "50kg bags",
 *   and the service had already taken that number off (run 4); reading it back off the name would put
 *   it straight back on. With no predicate, every figure in a name counts.
 */
export function theAimsThatAreNew(fresh: AnAim[], existing: AnAim[], theySaid: (n: number) => boolean = () => true): AnAim[] {
  const already = new Set(existing.map((o) => (o.name ?? '').trim().toLowerCase()));
  const kept: AnAim[] = [];
  for (const aim of fresh) {
    if (already.has((aim.name ?? '').trim().toLowerCase())) continue;
    const figure = aim.target == null ? theFigureInTheName(aim.name) : null;
    const withFigure = figure != null && theySaid(figure) ? { ...aim, target: figure } : aim;
    if (isTheSameAimSaidAsItsNumber(withFigure, [...existing, ...kept])) continue;
    if (isTheSameFigureWordedAgain(withFigure, [...existing, ...kept])) continue;
    if (isAnExistingAimRestatedWithoutItsNumber(withFigure, [...existing, ...kept])) continue;
    /* THE FIGURE IN THE NAME IS KEPT AS THE TARGET. This pushed `aim`, so "35% credit limit" was written
       with no number and the board could never read a rate against it (run 11). */
    kept.push(withFigure);
  }
  return kept;
}

/**
 * A NUMBER IN THE AIM'S OWN NAME IS ITS NUMBER, WHERE THEY SAID IT (screens request 117, part 2). "Sign 12 shops for
 * kitchen appliances in Nairobi." was kept with `target: null`, so the board's headline had no answer and no bar. The
 * setup chat reads the figure in the name (a740e362); an aim said in a check-in follows the same rule, and only with a
 * figure that is in the person's own words. An aim that already has a number keeps it.
 */
export function theNumberInTheNameIsKept<T extends { name: string; target: number | null }>(aims: T[], saidByThem: (n: number) => boolean): T[] {
  return aims.map((a) => {
    if (a.target != null) return a;
    const n = theCountTheNameAimsAt(a.name);
    return n != null && saidByThem(n) ? { ...a, target: n } : a;
  });
}

/**
 * ONLY THE COUNT THE NAME AIMS AT, NEVER ANY FIGURE IN IT. "Sign 12 shops for kitchen appliances in Nairobi." aims at
 * 12 shops: a doing word, then the figure, then what is counted. "A signed renewal before the end of March with no
 * discount past 12 percent" holds 12 as well, and it is a limit on the discount, not the aim. Read over a whole test
 * database, the looser rule would have given a hundred aims a number nobody meant. So the figure counts only where it
 * comes straight after the doing word that starts the name, and is not a share or a sum of money.
 */
const AIMS_AT = /^(?:sign|reach|hit|close|sell|win|onboard|recruit|hire|train|deliver|open|visit|enrol|register|collect|approve|disburse|install|serve|get|bring|complete|finish|launch|publish|submit)\s+(\d{1,3}(?:,\d{3})+|\d+)\s+(?!%|percent\b|per cent\b|naira\b|dollars?\b|shillings?\b|kes\b|ngn\b|usd\b|million\b|thousand\b|billion\b|k\b|m\b)[a-z]/i;
/*
 * AND "GET TO 20 PAYING CUSTOMERS", which is the same sentence with "to" in it (screens request 136, item 1). The
 * founder's own check-in read "Get to 20 paying customers by December." with no number, so her board had no answer and
 * no bar. Only the three doing words that take "to" and still aim at a count, and the same guard after the figure, so
 * "Get to 12 percent" and "Grow to 5 million in revenue" are still not aims at 12 or 5.
 */
const AIMS_AT_BY_GOING_TO = /^(?:get|grow|go)\s+(?:up\s+)?to\s+(\d{1,3}(?:,\d{3})+|\d+)\s+(?!%|percent\b|per cent\b|naira\b|dollars?\b|shillings?\b|kes\b|ngn\b|usd\b|million\b|thousand\b|billion\b|k\b|m\b)[a-z]/i;
export function theCountTheNameAimsAt(name: string | null | undefined): number | null {
  const said = (name ?? '').trim();
  const m = AIMS_AT.exec(said) ?? AIMS_AT_BY_GOING_TO.exec(said);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}
