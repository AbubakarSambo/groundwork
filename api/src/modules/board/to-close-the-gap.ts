import { isASalesKind, type AServedRecord, type AServedSection, type KindOfWork } from './the-kind-of-work';
import { theDayInWords, aDateOnly } from './the-day-in-words';
import { theWordsSayItIsALimit } from './a-measure-that-goes-down-is-still-going-well';
import { theUnitsOf, theMoneyOf } from './a-sales-aim-is-counted-from-the-deals';
import { aNumberPeopleCanRead } from './an-aim-is-a-sentence-about-somebody';

/**
 * TO CLOSE THE GAP (request 115 c; the prototype's B5 board-as-lead.txt, "To close the gap, two of these
 * three", each deal with its rep and its next step).
 *
 * ONLY FROM WHAT THE RECORD HOLDS. The gap is the team's own aim and its count: how many more are needed.
 * The deals that could close it are the open deals this reader is already served, in the groups the record
 * puts them in ("Likely" and "Possible", whose date is on or before the end). Each comes with whose it is
 * and what happens next only as somebody said it, or that nobody has said.
 *
 * WHAT IT NEVER CLAIMS. The record holds no chance of any deal closing, so nothing here says which ones
 * will. And a deal counts as one toward the aim only where the aim counts things, not money or a rate:
 * where the aim is money ("KES 8 million") or a share, no deal list is offered, because nothing on record
 * says what each deal is worth against it, and the section says that plainly.
 */
export interface ToCloseTheGap {
  /** How many more the team's aim needs. */
  gap: number;
  /** The aim it is measured against, in the lead's own words. */
  aim: string;
  /** One or two full sentences. */
  says: string;
  /**
   * The prototype's heading over the open deals that could close it ("To close the gap, two of these three"), counted by what
   * each deal holds in the aim's own measure (units, or value), after what the deals likely to close already hold. "All seven
   * of these" only when all seven are needed and enough; "more than these seven" when even all of them are not enough. Null
   * where the deals likely to close are enough, or no deal is open.
   */
  heading?: string | null;
  deals: { id: string; name: string; owner: string | null; says: string }[];
}

/** The kit's words where no next step is on record (sales-board.txt: "Collect the deposit; nothing is booked", "Nothing booked"). */
export const NOTHING_BOOKED = 'Nothing booked.';

function theNextStepOf(r: AServedRecord, nothingBooked: boolean): string {
  if (r.next) return r.nextSays ?? r.next;
  if (!nothingBooked) return r.nextSays ?? 'Nobody has said what happens next.';
  /* A step on the deal from a wait on its customer ("Waiting on Rose for the purchase of the two units"), as the grid reads it. */
  if (r.nextStep) return `${r.nextStep.replace(/[.\s]+$/, '')}.`;
  return NOTHING_BOOKED;
}

const NOT_A_COUNT_OF_THINGS = /(?:\b(?:KES|NGN|USD|GHS|ZAR|revenue|worth|value|naira|shillings?|dollars?|cedis|rand|percent|rate|share)\b|%)/i;
const OPEN_GROUPS = new Set(['likely', 'possible']);

export function toCloseTheGap(
  kind: KindOfWork | null,
  sections: AServedSection[] | null | undefined,
  teamAims: { name: string; target: number | null; count: number; ownerParticipantId?: string | null; dueOn?: Date | string | null; direction?: string | null; fromTheDeals?: { counts: string; currency?: string | null } | null }[],
  end: Date | null,
  now: Date,
  /* Release 1's sales board (release-one-sales-board): a deal with no next step on record reads the kit's "Nothing booked." */
  opts: { nothingBooked?: boolean; inShort?: boolean; /** The direct morning's shorter words (Hafsah, 25 October). Off, as before. */ short?: boolean } = {},
): ToCloseTheGap | null {
  if (!isASalesKind(kind) || !Array.isArray(sections)) return null;
  /* A limit not to go over, a share, a date or a zero is not an aim with a gap to close: "35 more are needed" of a credit limit of 35 per cent counted deals toward it (user journeys, F-4). */
  /* New leads are not closed by a deal closing, so an aim that counts them has no deals to close it. */
  const aim = teamAims.find((a) => !a.ownerParticipantId && typeof a.target === 'number' && a.target > a.count
    && (!a.direction || a.direction === 'AIM') && !theWordsSayItIsALimit(a.name) && a.fromTheDeals?.counts !== 'new leads');
  if (!aim || typeof aim.target !== 'number') return null;
  const gap = aim.target - aim.count;
  /* The day the aim itself is due, when it has one, is the day the headline and "Where each target stands" say; the check-in's end is only the fallback. */
  const day = aDateOnly(aim.dueOn ?? null) ?? end;
  const by = day ? ` by ${theDayInWords(day, now)}` : '';
  const aimName = aim.name.trim().replace(/[.!?]+$/, '');
  const measure: 'units' | 'value' | null = aim.fromTheDeals?.counts === 'units' ? 'units' : aim.fromTheDeals?.counts === 'value' ? 'value' : null;
  if (!measure && NOT_A_COUNT_OF_THINGS.test(aimName)) {
    return {
      gap, aim: aimName, deals: [],
      says: `${gap} more ${gap === 1 ? 'is' : 'are'} needed${by}. Nothing on record says what each deal is worth against this aim, so no deals are listed as closing the gap.`,
    };
  }
  const grid = sections.find((s: any) => Array.isArray(s.rows) && s.rows.some((r: AServedRecord) => r.kind === 'deal')) as any;
  const open: AServedRecord[] = grid
    ? (grid.rows as AServedRecord[])
      .filter((r) => r.kind === 'deal' && !!r.group && OPEN_GROUPS.has(r.group))
      .sort((a, b) => (a.group === b.group ? 0 : a.group === 'likely' ? -1 : 1))
    : [];
  const deals = open.map((r) => ({
    id: r.id,
    name: r.name,
    owner: r.owner ?? null,
    says: `${r.name} is ${r.owner ? `${r.owner === 'You' ? 'your' : `${r.owner}'s`} deal` : 'a deal with nobody\'s name on it yet'}. ${theNextStepOf(r, !!opts.nothingBooked)}`,
  }));
  if (measure) return byWhatEachDealHolds(measure, aim.fromTheDeals?.currency ?? null, gap, aimName, by, open, deals, !!opts.inShort, !!opts.short);
  const counted = `Each open deal is counted as one toward the aim of ${aim.target}.`;
  const heading = theHeading(gap, open.filter((r) => r.group === 'likely').map(() => 1), open.filter((r) => r.group === 'possible').map(() => 1 as number | null));
  if (!deals.length) {
    return { gap, aim: aimName, deals, heading: null, says: `${gap} more ${gap === 1 ? 'is' : 'are'} needed${by}, and no deal on record is still open before then. ${counted}` };
  }
  if (deals.length >= gap) {
    return {
      gap, aim: aimName, deals, heading,
      says: `To close the gap${by}, ${gap === deals.length ? `all ${deals.length}` : `${gap} of these ${deals.length}`} open ${deals.length === 1 ? 'deal' : 'deals'} would need to close. ${counted}`,
    };
  }
  return {
    gap, aim: aimName, deals, heading,
    says: `${gap} more ${gap === 1 ? 'is' : 'are'} needed${by}. There ${deals.length === 1 ? 'is 1 open deal' : `are ${deals.length} open deals`} on record, so even if ${deals.length === 1 ? 'it closes' : 'all of them close'}, ${gap - deals.length} more would be needed. ${counted}`,
  };
}

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const inWords = (n: number) => (n >= 0 && n < NUMBER_WORDS.length ? NUMBER_WORDS[n] : String(n));

/**
 * "To close the gap, two of these three", from what the deals likely to close hold and what each possible deal holds (null
 * where nothing on record says). The fewest possible deals that would be enough, the largest first. Null where the likely ones
 * are already enough, or there is no possible deal.
 */
export function theHeading(gap: number, likely: number[], possible: (number | null)[], short = false): string | null {
  const left = gap - likely.reduce((a, b) => a + b, 0);
  if (left <= 0 || !possible.length) return null;
  const known = possible.filter((x): x is number => typeof x === 'number' && x > 0).sort((a, b) => b - a);
  let sum = 0;
  let k = 0;
  while (k < known.length && sum < left) { sum += known[k]; k += 1; }
  const n = possible.length;
  /* Short, as the prototype's "two of these three" (Hafsah, 25 October): every one of them, and more. Off, as before. */
  if (sum < left && short) return n === 1 ? 'To close the gap, this one and more' : `To close the gap, all ${inWords(n)} and more`;
  if (sum < left) return `To close the gap, more than these ${inWords(n)} ${n === 1 ? 'deal is' : 'deals are'} needed`;
  return k === n ? (n === 1 ? 'To close the gap, this one' : n === 2 ? 'To close the gap, both of these' : `To close the gap, all ${inWords(n)} of these`) : `To close the gap, ${inWords(k)} of these ${inWords(n)}`;
}

/**
 * THE GAP COUNTED BY WHAT EACH DEAL HOLDS (Drop Access, 17 October 2026). Grace's board read "To close the gap, all seven of these"
 * for 55 units still to sell, over seven open deals that hold 13 units on record between them. Where the aim counts units or
 * value, each deal counts for what it holds, and a deal with nothing on record for it is said, never guessed.
 */
function byWhatEachDealHolds(
  measure: 'units' | 'value',
  currency: string | null,
  gap: number,
  aimName: string,
  by: string,
  open: AServedRecord[],
  deals: ToCloseTheGap['deals'],
  inShort = false,
  short = false,
): ToCloseTheGap {
  const holds = (r: AServedRecord): number | null => {
    if (measure === 'units') return theUnitsOf(r.fields ?? {});
    const m = theMoneyOf(r.fields ?? {});
    return m && (!currency || !m.currency || m.currency === currency) ? m.amount : null;
  };
  const n = (x: number) => (measure === 'value' && currency ? `${currency} ${aNumberPeopleCanRead(x)}` : aNumberPeopleCanRead(x));
  const thing = measure === 'units' ? (x: number) => ` ${x === 1 ? 'unit' : 'units'}` : () => '';
  const likely = open.filter((r) => r.group === 'likely');
  const possible = open.filter((r) => r.group === 'possible');
  const likelyHold = likely.reduce((a, r) => a + (holds(r) ?? 0), 0);
  const left = gap - likelyHold;
  const needed = measure === 'value' ? `${n(gap)} more is needed${by}.` : `${n(gap)} more ${gap === 1 ? 'unit is' : 'units are'} needed${by}.`;
  const heading = theHeading(gap, likely.map((r) => holds(r) ?? 0), possible.map(holds), short);
  if (!open.length) return { gap, aim: aimName, deals, heading: null, says: `${needed} No deal on record is still open before then.` };
  const fromLikely = likelyHold > 0 ? ` The deals likely to close hold ${n(likelyHold)}${thing(likelyHold)}.` : '';
  if (left <= 0) return { gap, aim: aimName, deals, heading, says: `${needed}${fromLikely} That is enough to close the gap if they close.` };
  const known = possible.map(holds).filter((x): x is number => typeof x === 'number');
  const total = known.reduce((a, b) => a + b, 0);
  const unknown = possible.length - known.length;
  const what = measure === 'units' ? 'how many units' : 'what it is worth';
  const unsaid = unknown
    ? ` ${unknown === 1 ? '1 of them has' : `${inWords(unknown).replace(/^./, (c) => c.toUpperCase())} of them have`} nothing on record for ${what}, so ${unknown === 1 ? 'it is' : 'they are'} not counted.`
    : '';
  /*
   * IN SHORT, NAMING THE DEAL WITH NOTHING ON RECORD (Hafsah's quality pass, 18 October, B-6): "The deals likely to close hold 6
   * units. Even if all five here close too, that is 27 units, 28 short. Tuskys Westgate has no number of units yet." The heading
   * already says the gap; the headline already says how many are needed.
   */
  if (inShort && possible.length) {
    const all = likelyHold + total;
    const here = possible.length === 1 ? 'this one closes' : `all ${inWords(possible.length)} here close`;
    const also = likelyHold > 0 ? ' too' : '';
    const sum = all >= gap ? `that is ${n(all)}${thing(all)}, enough to close the gap.` : `that is ${n(all)}${thing(all)}, ${n(gap - all)} short.`;
    if (short) {
      /* Customer names go in the list, not here (Hafsah, 25 October): the count of deals with no number, said once. */
      const noNumber = possible.filter((r) => holds(r) == null).length;
      const unsaidShort = noNumber ? ` ${noNumber === 1 ? 'One of them has' : `${inWords(noNumber).replace(/^./, (c) => c.toUpperCase())} of them have`} no ${measure === 'units' ? 'number of units' : 'value'} yet.` : '';
      return { gap, aim: aimName, deals, heading, says: `Even if ${here}${also}, ${sum}${unsaidShort}` };
    }
    const noNumber = possible.filter((r) => holds(r) == null).map((r) => r.name);
    const unsaidHere = noNumber.length
      ? ` ${noNumber.length === 1 ? noNumber[0] : `${noNumber.slice(0, -1).join(', ')} and ${noNumber[noNumber.length - 1]}`} ${noNumber.length === 1 ? 'has' : 'have'} no ${measure === 'units' ? 'number of units' : 'value'} yet.`
      : '';
    const start = likelyHold > 0 ? `The deals likely to close hold ${n(likelyHold)}${thing(likelyHold)}. ` : '';
    return { gap, aim: aimName, deals, heading, says: `${start}Even if ${here}${also}, ${sum}${unsaidHere}` };
  }
  const these = `The ${possible.length === 1 ? 'open deal' : `${inWords(possible.length)} open deals`} still possible ${possible.length === 1 ? 'holds' : 'hold'} ${n(total)}${thing(total)} on record`;
  const so = !possible.length
    ? ''
    : total >= left
      ? `, so ${heading?.replace(/^To close the gap, /, '') ?? 'some of them'} would need to close.`
      : `, so even if all of them close, ${n(left - total)} more${thing(left - total)} would be needed.`;
  return { gap, aim: aimName, deals, heading, says: `${needed}${fromLikely}${possible.length ? ` ${these}${so}` : ''}${unsaid}` };
}
