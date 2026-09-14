/**
 * TEN PEOPLE, ONE NUMBER, AND THE PRODUCT COULD NOT DO THE ARITHMETIC.
 *
 * Watched live. A chief of staff gave ten salespeople with their regions, their tenure and what
 * each closed last year, said the team must reach 270, and asked for each person's number. Asked
 * four times. The first two answers restated the question. The third said "here are the details for
 * each salesperson and their calculated target" and listed only the inputs. The fourth gave three
 * names out of ten, totalling 66, and closed the session.
 *
 * A model should not be doing this. Splitting a total is arithmetic with a policy on top, and both
 * halves want to be inspectable: a chief of staff is going to argue with these numbers in front of
 * the people they belong to, and "the model said so" is not an answer she can give.
 *
 * SO THE ARITHMETIC IS HERE AND THE MODEL ONLY EVER WRITES THE SENTENCE. The split always sums to
 * the total, exactly. Every number carries the reason it is what it is, in facts - months here, what
 * they closed, what that annualises to - so she can change the policy rather than haggle with it.
 *
 * THE POLICY, AND WHY. Somebody in their first year did not have a full year, so their figure
 * understates them: annualise it before comparing anybody. After that, headroom falls with tenure -
 * a seven-year seller near capacity has less of it than somebody in their second year, and loading
 * the growth onto the veterans is how a quota gets quietly missed by the people best able to see it
 * coming. None of this is a judgement about anybody. It is what the last year actually holds.
 */

export interface Person {
  /** Whatever identifies them to the caller: a participant id, an email, a name. */
  key: string;
  /** What they closed in the period being read from. */
  lastPeriod: number;
  /** How long they have been doing the job, in months. */
  months: number;
}

export interface Share {
  key: string;
  /** Their number. The shares always sum to the total exactly. */
  target: number;
  /** What their last period annualises to, which is the honest base for anybody part-year. */
  runRate: number;
  /** The growth their number asks of them, against that run rate. */
  upliftPct: number;
  /** Why it is this number, in facts rather than adjectives. */
  because: string;
}

const MONTHS_IN_A_YEAR = 12;

/**
 * HOW MUCH HEADROOM EACH BAND HAS, and these are the argument rather than the answer.
 *
 * Deliberately a small table a person can read and disagree with in one look, rather than a curve
 * nobody can picture. A chief of staff who thinks year two has more in it than this changes one
 * number here and the whole split moves with it.
 */
export const HEADROOM: { upToMonths: number; weight: number; saying: string }[] = [
  { upToMonths: 12, weight: 1.45, saying: 'still in their first year, so the run rate is the fair base and there is room above it' },
  { upToMonths: 24, weight: 1.30, saying: 'in their second year, which is where most of the improvement happens' },
  { upToMonths: 60, weight: 1.14, saying: 'established, so the growth asked of them is modest' },
  { upToMonths: Infinity, weight: 1.06, saying: 'longest in the job and nearest capacity, so they carry the least of the increase' },
];

export function headroomFor(months: number) {
  return HEADROOM.find((b) => months < b.upToMonths) ?? HEADROOM[HEADROOM.length - 1];
}

/**
 * AND THE WEIGHT MOVES SMOOTHLY BETWEEN THE BANDS, BECAUSE A BIRTHDAY IS NOT AN EVENT.
 *
 * Read on the real ten: somebody at 23 months sat in the second-year band at 1.30 and somebody at
 * 24 months dropped to 1.14. One month of tenure, twelve per cent off their number - so two people
 * a month apart get materially different asks, and a person's target falls the day they get more
 * experienced. Nobody would defend that in the room, which is the test.
 *
 * The bands stay: they are the thing a chief of staff reads and argues with. They are anchors on a
 * line rather than steps on a staircase.
 */
export function weightFor(months: number): number {
  const anchors: [number, number][] = [[0, HEADROOM[0].weight], [12, HEADROOM[1].weight], [24, HEADROOM[2].weight], [60, HEADROOM[3].weight]];
  const m = Math.max(0, months);
  const last = anchors[anchors.length - 1];
  if (m >= last[0]) return last[1];
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const [x0, y0] = anchors[i];
    const [x1, y1] = anchors[i + 1];
    if (m >= x0 && m < x1) return y0 + ((y1 - y0) * (m - x0)) / (x1 - x0);
  }
  return last[1];
}

/**
 * WHAT A PART-YEAR ACTUALLY MEANS.
 *
 * Somebody six months in who closed 6 did not do half as well as somebody who closed 12 in a year;
 * they did the same and had half the time. Comparing the raw figures would hand the newest people
 * the largest growth targets for the worst reason.
 */
export function runRateOf(p: Person): number {
  if (p.months >= MONTHS_IN_A_YEAR || p.months <= 0) return p.lastPeriod;
  return (p.lastPeriod * MONTHS_IN_A_YEAR) / p.months;
}

/**
 * THE SPLIT. Weighted by run rate and headroom, then rounded so the parts sum to the whole.
 *
 * Largest remainder rather than rounding each share on its own: ten independent roundings of a
 * fraction land anywhere from 265 to 275, and a split that does not add up to the number committed
 * to the board is not a split, it is a suggestion.
 */
export function splitTheTotal(people: Person[], total: number): Share[] {
  if (!people.length || total <= 0) return [];

  const weighted = people.map((p) => {
    const runRate = runRateOf(p);
    const band = headroomFor(p.months);
    return { p, runRate, band, raw: Math.max(0, runRate * weightFor(p.months)) };
  });

  const sum = weighted.reduce((a, w) => a + w.raw, 0);
  /* Nobody closed anything anywhere: there is no shape in the data to divide by, so it divides
     evenly and says so rather than inventing one. */
  const even = sum <= 0;

  const exact = weighted.map((w) => (even ? total / people.length : (w.raw / sum) * total));
  const floors = exact.map((n) => Math.floor(n));
  let left = total - floors.reduce((a, n) => a + n, 0);

  /* The ones furthest past their own floor get the spare units, biggest fraction first. */
  const order = exact
    .map((n, i) => ({ i, frac: n - Math.floor(n) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  const share = [...floors];
  for (const { i } of order) {
    if (left <= 0) break;
    share[i] += 1;
    left -= 1;
  }

  return weighted.map((w, i) => {
    const target = share[i];
    const runRate = Math.round(w.runRate * 10) / 10;
    const upliftPct = runRate > 0 ? Math.round(((target - runRate) / runRate) * 100) : 0;
    const partYear = w.p.months < MONTHS_IN_A_YEAR && w.p.months > 0;
    return {
      key: w.p.key,
      target,
      runRate,
      upliftPct,
      because: even
        ? 'Nothing in the last period to divide by, so the total is split evenly.'
        : `Closed ${w.p.lastPeriod} in ${w.p.months} months` +
          (partYear ? `, which is about ${runRate} a year at that rate` : '') +
          `. ${w.band.saying.charAt(0).toUpperCase()}${w.band.saying.slice(1)}. ` +
          `${target} asks for ${upliftPct >= 0 ? `${upliftPct}% more` : `${Math.abs(upliftPct)}% less`} than that.`,
    };
  });
}

/** The one line that goes above the table, so nobody has to add the column up to trust it. */
export function sayingWhatTheSplitDoes(shares: Share[], total: number): string {
  const sum = shares.reduce((a, s) => a + s.target, 0);
  const most = [...shares].sort((a, b) => b.upliftPct - a.upliftPct)[0];
  return `${shares.length} numbers, adding to ${sum}${sum === total ? '' : ` (not ${total})`}. ` +
    `The largest increase asked of anybody is ${most?.upliftPct ?? 0}%. ` +
    'Change any of them and the rest do not move: they are a proposal, not a formula anybody is held to.';
}
