import type { ADeposit } from '../board/a-deals-proof-is-about-that-deal';
import { aNumberPeopleCanRead } from '../board/an-aim-is-a-sentence-about-somebody';
import { theMoneyOf, whatWasSold, type ACountFromTheDeals, type ADealOnRecord, type WhatASalesAimCounts } from '../board/a-sales-aim-is-counted-from-the-deals';
import { theStagesOnRecord, theMovesBetween, theDayItWasWon } from '../board/a-deals-stages-are-kept';
import { notAnsweringSince, hasStalled, theContactOf, STALLED_AFTER_WORKING_DAYS } from '../board/a-deal-that-has-stalled';
import { theCriteriaOnRecord, THE_FOUR, type ACriterion } from '../board/a-deals-four-criteria';
import { theBuyingDateOf } from '../board/a-deals-value-and-buying-date';
import type { AFigure } from './the-weekly-report';
import type { TheSalesWeekInWords } from './the-sales-week-in-words';

/**
 * THE WEEK IN NUMBERS FOR A SALES CHECK-IN (Drop Access, 17 October 2026).
 *
 * Grace's weekly report read "81% of check-ins made", "5 things people said this week with a photo or document behind them",
 * and then seventeen rows of targets and spoken aims, most of them 0: "0 units sold by 30 October, Kevin Omondi's number",
 * "0 actually 120 units, Kevin Omondi's own aim". The prototype (B4-reports-and-sharing/weekly-report.txt) reads "96% of
 * check-ins made this week", "14 deals moved stage", "5 sales closed", "3 deals hit the stall rule". Hafsah decided: "the
 * weekly report gives check-ins made, deals that moved stage, deals won (proven and said), value won, new leads and deals that
 * stalled, showing only targets with numbers."
 *
 * So, for a sales check-in, in this order, each counted from the deals on record for the report's week:
 *   check-ins made (as before), deals that moved stage, sales closed (with how many have proof of payment), value won, new
 *   leads, and deals that hit the stall rule. Then only the targets the lead set that the deals count (units sold, value sold,
 *   sales, new leads), each read the way the board reads its counts ("65 of 120 units sold by 30 October, 65 with proof of
 *   payment"). A person's own spoken aim, an aim that repeats a target, and a 0 with no deal behind it are not listed.
 *
 * NEVER INVENTED. A move is a change of stage the record kept, with its day (a-deals-stages-are-kept). A deal that came onto
 * the record before stages were kept has no moves on record, and the figure says how many such deals it cannot count. A sale
 * closed this week is a deal the record first shows at the last stage this week. The stall rule is the board's own.
 *
 * KEPT WITHOUT NAMES. Only counts are kept when a check-in comes in; whose a target is stays a participant id, named only
 * when the report is served, through the same wrapper as every other line.
 */

/** What is kept about the deals for one week. Counts only. */
export interface TheSalesWeek {
  /** Deals that moved from one stage to another this week, from the stages kept. */
  moved: number;
  /** Deals on record whose stages were not kept (they came onto the record before), so a move of theirs cannot be counted. */
  movesNotKept: number;
  /** Deals on record in all. */
  deals: number;
  /** Deals the record first shows at the last stage this week, and of them, the ones proof of payment shows. */
  won: number;
  wonProven: number;
  /** Of the rest, the ones a document backs that is not a payment (a signed order). Absent on a week kept before. */
  wonShown?: number;
  /** What those deals are worth, in the currency most of them are written in. */
  value: { currency: string | null; amount: number; proven: number; leftOut: number };
  /** Deals that came onto the record this week. */
  newLeads: number;
  /** Open deals that have hit the stall rule by the end of the week. */
  stalled: number;
  /*
   * WHAT THE DEALS DID THIS WEEK, KEPT FOR THE KIT'S "WHAT THIS WEEK SHOWS", "WHAT CHANGED" AND "FOR YOU TO DO NEXT WEEK"
   * (Hafsah's points 23 to 25, 18 October). Whose a deal is stays a participant id; a deal's own name is the customer's.
   * Absent on a week kept before.
   */
  /** Of the deals that moved stage this week, the ones a photo or document backs. */
  backed?: number;
  /** Each deal that moved forward this week, or came onto the record already won this week. */
  moves?: AMoveThisWeek[];
  /** What each person's own deals did this week. */
  people?: APersonsSalesWeek[];
  /** The lead's stall rule the week was read by: null where none is set. Absent on a week read by the rule the board always used. */
  stallDays?: number | null;
  /** Each open deal at the stall rule at the end of the week, with the day its customer went quiet. */
  stalledDeals?: AStalledDeal[];
  /**
   * Each deal dropped this week: the customer turned it down or the rep gave it up, with the rep's own line (a-deal-that-was-dropped).
   * A dropped deal is not open, so it is in no count of open deals and never at the stall rule. Absent on a week kept before.
   */
  droppedDeals?: ADroppedThisWeek[];
  /** Sales closed this week that a photo or document backs: a payment record or a signed order (quality pass, 18 October, W-2). Absent on a week kept before. */
  salesBacked?: number;
  /** The week in words, by label (the-sales-week-in-words; quality pass, 18 October, W-3 to W-8). Absent on a week kept before. */
  words?: TheSalesWeekInWords;
}

export interface ADroppedThisWeek { name: string; ownerParticipantId: string | null; on: string; line: string; because: string | null }

export interface AMoveThisWeek {
  name: string;
  ownerParticipantId: string | null;
  /** The stage it moved from, or null for a deal that came onto the record already won this week. */
  from: string | null;
  to: string;
  /** It reached the last stage this week. */
  won: boolean;
  /** A payment record backs it. */
  paid: boolean;
  /** A photo or document backs a line about it. */
  proven: boolean;
  /** The M-Pesa code typed for it, where that is its payment record. */
  mpesaCode?: string | null;
  /** Its only payment record is a deposit (final real-model check, item 10). */
  deposit?: ADeposit | null;
  /** The lead's rule needs a payment or a signed order and neither is on record, so it is not counted as sold (item 14). */
  notCounted?: boolean;
}

export interface APersonsSalesWeek {
  participantId: string;
  checkedIn: boolean;
  /** Their deals on record. */
  deals: number;
  /** Their sales closed this week, and of them the ones a payment record backs. */
  closed: number;
  closedPaid: number;
  /** Their other deals that moved forward a stage this week. */
  movedOn: number;
  /** Their open deals, the ones with all four criteria on record, and how many lack each criterion. */
  open: number;
  complete: number;
  missing: Partial<Record<ACriterion, number>>;
}

export interface AStalledDeal { name: string; ownerParticipantId: string | null; since: string }

/** What a target counted from the deals holds, as kept with the week. */
export interface ATargetFromTheDeals {
  counts: WhatASalesAimCounts;
  count: number;
  proven: number | null;
  currency: string | null;
  window: 'week' | null;
  thing: string;
  /** Deals on record behind it: the holder's own, or the team's. A 0 with none behind it is not listed. */
  dealsBehind: number;
}

export function aTargetFromTheDeals(c: ACountFromTheDeals, dealsBehind: number): ATargetFromTheDeals {
  return { counts: c.counts, count: c.count, proven: c.proven, currency: c.currency, window: c.window ?? null, thing: c.thing, dealsBehind };
}

const read = aNumberPeopleCanRead;
const money = (currency: string | null, n: number) => (currency ? `${currency} ${read(n)}` : read(n));
const dayKey = (d: Date) => d.getTime();

/** The week's deal counts, from the deals on record, between the week's start and `at`. */
export function theSalesWeek(
  deals: ADealOnRecord[],
  stages: string[],
  lines: { text: string; createdAt: Date | string }[],
  start: Date,
  at: Date,
  /** Every name on our side (the check-in and the roster), so a colleague not answering is not counted as a customer gone quiet. */
  ourSide: string[] = [],
  /** The people the week is about, with whether they checked in this week. Their own deals are read for each. */
  people: { participantId: string; checkedIn: boolean }[] = [],
  /** A deal's buying date as the board reads it (its details, or what its owner said). */
  buyingDateOf: (d: ADealOnRecord) => string | null = (d) => theBuyingDateOf(d.fields),
  /*
   * The lead's own stall rule, the board's (the-stall-rule; standing decision 4, 18 October): null where she set none, so no deal
   * hits a stall rule; left out, the rule the week always read.
   */
  stallDays?: number | null,
): TheSalesWeek {
  const last = stages.length ? stages[stages.length - 1] : 'Won';
  const inTheWeek = (d: Date | null) => !!d && dayKey(d) >= dayKey(start) && dayKey(d) <= dayKey(at);
  let moved = 0;
  let movesNotKept = 0;
  const wonDeals: ADealOnRecord[] = [];
  let stalled = 0;
  let backed = 0;
  const moves: AMoveThisWeek[] = [];
  const stalledDeals: AStalledDeal[] = [];
  const droppedDeals: ADroppedThisWeek[] = [];
  const said = lines.filter((l) => new Date(l.createdAt).getTime() <= at.getTime());
  /* Dropped by the end of the week: the day its owner said so is on or before the week's end. */
  const droppedBy = (d: ADealOnRecord) => !!d.dropped && d.dropped.on <= at.toISOString().slice(0, 10);
  const where = (stage: string) => stages.findIndex((x) => x.trim().toLowerCase() === String(stage ?? '').trim().toLowerCase());
  for (const d of deals) {
    if (d.firstOnRecordAt.getTime() > at.getTime()) continue;
    const kept = !!d.stagesKept && d.stagesKept.length > 0;
    const onRecord = theStagesOnRecord(d);
    /*
     * A FIRST MENTION IS NOT A MOVE (quality pass, 18 October, W-2, W-6): Mama Pima Stores was put at Contacted and at Need established in
     * the same instant, the first time it was named, and read "moved forward, from Contacted to Need established". A move is a stage
     * kept later than the one before it.
     */
    const aRealMove = (i: number) => new Date(onRecord[i].on).getTime() > new Date(onRecord[i - 1].on).getTime();
    /* A deal with no stage at all that was dropped (Kamau Electricals) never had a move to keep. */
    if (!kept) { if (!(d.dropped && !String(d.stage ?? '').trim())) movesNotKept += 1; }
    else if (theMovesBetween(onRecord, start, at).length > 0 && onRecord.some((_s, i) => i > 0 && aRealMove(i) && new Date(onRecord[i].on).getTime() >= start.getTime() && new Date(onRecord[i].on).getTime() <= at.getTime() && onRecord[i].stage.trim().toLowerCase() !== onRecord[i - 1].stage.trim().toLowerCase())) {
      moved += 1;
      if (d.proven) backed += 1;
    }
    const wonOn = theDayItWasWon(onRecord, last);
    const wonThisWeek = !!wonOn && inTheWeek(wonOn);
    if (wonThisWeek) wonDeals.push(d);
    /* Forward only: the furthest stage it reached this week, from where it stood before its first move this week. */
    let from: string | null = null;
    let to: string | null = null;
    for (let i = 1; i < onRecord.length; i += 1) {
      const t = new Date(onRecord[i].on).getTime();
      if (t < start.getTime() || t > at.getTime() || onRecord[i].stage.trim().toLowerCase() === onRecord[i - 1].stage.trim().toLowerCase() || !aRealMove(i)) continue;
      if (where(onRecord[i].stage) <= where(onRecord[i - 1].stage) && where(onRecord[i - 1].stage) >= 0) continue;
      if (from === null) from = onRecord[i - 1].stage;
      to = onRecord[i].stage;
    }
    const more = { ...((d as any).mpesaCode ? { mpesaCode: (d as any).mpesaCode } : {}), ...(d.deposit ? { deposit: d.deposit } : {}), ...(d.wonNeedsProof && !d.paid && !d.signed ? { notCounted: true } : {}) };
    if (from && to) moves.push({ name: d.name, ownerParticipantId: d.ownerParticipantId, from, to, won: wonThisWeek && to.trim().toLowerCase() === last.toLowerCase(), paid: !!d.paid, proven: !!d.proven, ...more });
    else if (wonThisWeek) moves.push({ name: d.name, ownerParticipantId: d.ownerParticipantId, from: null, to: last, won: true, paid: !!d.paid, proven: !!d.proven, ...more });
    const isWon = String(d.stage ?? '').toLowerCase() === last.toLowerCase();
    if (!isWon && droppedBy(d)) {
      if (inTheWeek(new Date(`${d.dropped!.on}T12:00:00Z`))) droppedDeals.push({ name: d.name, ownerParticipantId: d.ownerParticipantId, on: d.dropped!.on, line: d.dropped!.line, because: d.dropped!.because });
      continue;
    }
    const since = isWon ? null : notAnsweringSince(d.name, said, { people: ourSide, contact: theContactOf(d.fields), peopleThere: d.peopleThere ?? [] });
    if (!isWon && (stallDays === undefined ? hasStalled(since, at) : hasStalled(since, at, stallDays))) {
      stalled += 1;
      stalledDeals.push({ name: d.name, ownerParticipantId: d.ownerParticipantId, since: since!.toISOString() });
    }
  }
  /* What each person's own deals did. A deal down as won is not open; its criteria are not asked for again. */
  const eachPerson: APersonsSalesWeek[] = people.map(({ participantId, checkedIn }) => {
    const theirs = deals.filter((d) => d.ownerParticipantId === participantId && d.firstOnRecordAt.getTime() <= at.getTime() && !droppedBy(d));
    const open = theirs.filter((d) => String(d.stage ?? '').toLowerCase() !== last.toLowerCase());
    const missing: Partial<Record<ACriterion, number>> = {};
    let complete = 0;
    for (const d of open) {
      const c = theCriteriaOnRecord(d.fields, buyingDateOf(d));
      const lacks = THE_FOUR.filter((k) => !c[k]);
      if (!lacks.length) complete += 1;
      for (const k of lacks) missing[k] = (missing[k] ?? 0) + 1;
    }
    const mine = moves.filter((m) => m.ownerParticipantId === participantId);
    return {
      participantId, checkedIn, deals: theirs.length,
      closed: mine.filter((m) => m.won).length, closedPaid: mine.filter((m) => m.won && m.paid).length,
      movedOn: mine.filter((m) => !m.won).length,
      open: open.length, complete, missing,
    };
  });
  const each = wonDeals.map((d) => ({ d, m: theMoneyOf(whatWasSold(d)) }));
  const currencies = each.map((x) => x.m?.currency ?? '').filter(Boolean);
  const currency = currencies.sort((a, b) => currencies.filter((c) => c === b).length - currencies.filter((c) => c === a).length)[0] ?? null;
  const value = { currency, amount: 0, proven: 0, leftOut: 0 };
  for (const { d, m } of each) {
    if (!m || (currency && m.currency && m.currency !== currency)) { value.leftOut += 1; continue; }
    value.amount += m.amount;
    if (d.paid) value.proven += m.amount;
  }
  return {
    moved,
    movesNotKept,
    deals: deals.filter((d) => d.firstOnRecordAt.getTime() <= at.getTime()).length,
    won: wonDeals.length,
    wonProven: wonDeals.filter((d) => d.paid).length,
    wonShown: wonDeals.filter((d) => !d.paid && d.proven).length,
    salesBacked: wonDeals.filter((d) => d.paid || d.proven).length,
    value,
    newLeads: deals.filter((d) => inTheWeek(d.firstOnRecordAt)).length,
    stalled,
    backed,
    moves,
    people: eachPerson,
    stalledDeals,
    droppedDeals,
    ...(stallDays !== undefined ? { stallDays } : {}),
  };
}

const s = (n: number, one: string, many: string) => (n === 1 ? one : many);
const Cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * The tiles that count the deals, after "of check-ins made this week": the kit's four (Hafsah's point 23, 18 October, which
 * replaces her answer of 17 October): deals moved stage, moves backed by a photo or document, sales closed (with how many
 * proof of payment shows, in the tile's own words), and deals at the stall rule. Value won, new leads and the list of
 * targets are not in the week in numbers any more; the board still reads every target.
 */
export function theSalesWeekFigures(w: TheSalesWeek): AFigure[] {
  const out: AFigure[] = [];

  /* Deals that moved stage. */
  const keptOnes = w.deals - w.movesNotKept;
  if (w.deals > 0 && keptOnes === 0) {
    out.push({
      figure: 'Not counted yet',
      of: 'deals moved stage',
      says: `${w.deals === 1 ? 'The one deal was' : `The ${read(w.deals)} deals were`} on record before each move between stages was kept, so no move this week can be counted yet.`,
    });
  } else {
    const notKept = w.movesNotKept
      ? ` ${w.movesNotKept === 1 ? '1 deal was' : `${read(w.movesNotKept)} deals were`} on record before each move between stages was kept, so a move of ${s(w.movesNotKept, 'its', 'theirs')} is not counted.`
      : '';
    out.push({
      figure: read(w.moved),
      of: w.movesNotKept ? `${s(w.moved, 'deal', 'deals')} moved stage, of the ${read(keptOnes)} whose moves are kept` : `${s(w.moved, 'deal', 'deals')} moved stage`,
      says: `${w.moved === 0 ? 'No deal moved' : `${read(w.moved)} ${s(w.moved, 'deal moved', 'deals moved')}`} from one stage to another this week.${notKept}`,
    });
  }

  /* Sales backed by a document (quality pass, 18 October, W-2): a payment record or a signed order behind a sale closed this week. */
  if (typeof w.salesBacked === 'number' && w.deals > 0) {
    const n = w.salesBacked;
    out.push({
      figure: read(n),
      of: `${s(n, 'sale', 'sales')} backed by a document`,
      says: w.won === 0
        ? 'No sale was closed this week, so there is no sale for a document to back.'
        : n === w.won
          ? `${w.won === 1 ? 'The sale' : w.won === 2 ? 'Both sales' : `All ${read(w.won)} sales`} closed this week ${w.won === 1 ? 'has' : 'have'} a payment record or a signed order behind ${w.won === 1 ? 'it' : 'them'}.`
          : `${read(n)} of the ${read(w.won)} sales closed this week ${n === 1 ? 'has' : 'have'} a payment record or a signed order behind ${n === 1 ? 'it' : 'them'}.`,
    });
  } else if (typeof w.backed === 'number' && keptOnes > 0) {
    /* Moves backed by a photo or document (the kit's third tile), of the deals that moved stage, on a week kept before. */
    const n = w.backed;
    out.push({
      figure: read(n),
      of: `${s(n, 'move', 'moves')} backed by a photo or document`,
      says: w.moved === 0
        ? 'No deal moved stage this week, so there is no move for a photo or document to back.'
        : n === 0
          ? (w.moved === 1
            ? 'The deal that moved stage this week has no photo or document behind it yet.'
            : `None of the ${read(w.moved)} deals that moved stage this week has a photo or document behind it yet.`)
          : n === w.moved
            ? `${w.moved === 1 ? 'The deal' : w.moved === 2 ? 'Both deals' : `All ${read(w.moved)} deals`} that moved stage this week ${w.moved === 1 ? 'has' : 'have'} a photo or document behind ${w.moved === 1 ? 'it' : 'them'}.`
            : `${read(n)} of the ${read(w.moved)} deals that moved stage this week ${n === 1 ? 'has' : 'have'} a photo or document behind ${n === 1 ? 'it' : 'them'}.`,
    });
  }

  /* Sales closed, with how many proof of payment shows. Said and proven both count (Hafsah's answer of 17 October). */
  out.push({
    figure: read(w.won),
    of: w.won === 0 ? 'sales closed' : `${s(w.won, 'sale', 'sales')} closed, ${read(w.wonProven)} with proof of payment`,
    says: w.won === 0
      ? 'No sale was closed this week.'
      : w.won === w.wonProven
        ? `${Cap(w.won === 1 ? 'one sale was' : `${read(w.won)} sales were`)} closed this week, and proof of payment shows ${s(w.won, 'it', w.won === 2 ? 'both' : 'all of them')}.`
        : !w.wonShown
          ? `${Cap(w.won === 1 ? 'one sale was' : `${read(w.won)} sales were`)} closed this week. Proof of payment shows ${w.wonProven === 0 ? 'none of them yet' : read(w.wonProven)}, and the ${w.wonProven === 0 ? (w.won === 1 ? 'sale is' : 'sales are') : (w.won - w.wonProven === 1 ? 'other is' : 'others are')} the word of the person who closed ${w.won - w.wonProven === 1 ? 'it' : 'them'}.`
          /* A signed order proves the order, not the payment, and is never the seller's word alone (Hafsah's point 12). */
          : (() => {
            const word = w.won - w.wonProven - w.wonShown;
            const backs = w.wonProven === 0 && word === 0 ? (w.won === 1 ? 'it' : 'them') : `${read(w.wonShown)} more`;
            const theWord = word > 0 ? ` The ${word === 1 ? 'other is' : `other ${read(word)} are`} the word of the person who closed ${word === 1 ? 'it' : 'them'}.` : '';
            return `${Cap(w.won === 1 ? 'one sale was' : `${read(w.won)} sales were`)} closed this week. Proof of payment shows ${w.wonProven === 0 ? 'none of them yet' : read(w.wonProven)}. A document backs ${backs}, but it does not show a payment.${theWord}`;
          })(),
  });

  /* Deals that hit the stall rule: none set, the tile says so (standing decision 4). */
  if (w.stallDays === null) {
    out.push({ figure: '0', of: 'deals hit a stall rule', says: 'No stall rule is set yet, so no deal is marked for going quiet.' });
    return out;
  }
  const days = typeof w.stallDays === 'number' ? w.stallDays : STALLED_AFTER_WORKING_DAYS;
  out.push({
    figure: read(w.stalled),
    of: `${s(w.stalled, 'deal', 'deals')} hit the stall rule`,
    says: w.stalled === 0
      ? `No open deal has gone ${days} working days without the customer answering.`
      : `${read(w.stalled)} open ${s(w.stalled, 'deal has', 'deals have')} gone ${days} working days or more without the customer answering, as said in a check-in.`,
  });
  return out;
}

/* ------------------------------------------------------------------------------------------------
 * THE TARGETS THE DEALS COUNT
 * ---------------------------------------------------------------------------------------------- */

export interface ASalesTarget {
  id: string;
  name: string;
  target: number | null;
  ownerParticipantId: string | null;
  /** Set by whoever runs the check-in: on the board, or said by her. */
  setByTheLead?: boolean;
  /** Set on the board, not said in a check-in. */
  setOnTheBoard?: boolean;
  fromTheDeals?: ATargetFromTheDeals | null;
}

/** The day an aim's own words give: "Units sold by 30 October" is "30 October". */
function byWhen(name: string): string | null {
  const m = /\b(?:by|before)\s+((?:the\s+)?(?:end of\s+)?[A-Za-z0-9 ]+?)\s*[.!]?$/i.exec(name.trim());
  if (!m) return null;
  const when = m[1].trim().replace(/\b(\d{1,2})(?:st|nd|rd|th)\b/gi, '$1');
  /* "October 30" reads "30 October", as the board says a day. */
  const flipped = when.replace(/^([A-Z][a-z]+)\s+(\d{1,2})$/, '$2 $1');
  return flipped || null;
}

/**
 * Which targets are listed: the ones the lead set that the deals count, with something behind them. Where two say the same
 * thing (the same person, the same measure, the same number), the one set on the board is kept.
 */
export function theSalesTargetsToList<T extends ASalesTarget>(targets: T[]): T[] {
  const counted = targets.filter((t) => t.fromTheDeals && t.setByTheLead && typeof t.target === 'number' && t.target > 0
    && (t.fromTheDeals.count > 0 || t.fromTheDeals.dealsBehind > 0));
  const out: T[] = [];
  const key = (t: T) => `${t.ownerParticipantId ?? 'team'}|${t.fromTheDeals!.counts}|${t.target}`;
  for (const t of [...counted].sort((a, b) => Number(!!b.setOnTheBoard) - Number(!!a.setOnTheBoard))) {
    if (out.some((o) => key(o) === key(t))) continue;
    out.push(t);
  }
  /* In the order they were set: the team's first, then each person's. */
  return targets.filter((t) => out.includes(t)).sort((a, b) => Number(!!a.ownerParticipantId) - Number(!!b.ownerParticipantId));
}

/** Whose a target is, for this reader: the team's, the reader's own, or somebody's by report label. */
export type WhoseTarget = 'team' | 'you' | { label: string };

/** One target, read like the board's counts: "65 of 120 units sold by 30 October, 65 with proof of payment". */
export function aSalesTargetThisWeek(t: ASalesTarget, whose: WhoseTarget, againstTheAim = true): AFigure | null {
  const c = t.fromTheDeals;
  if (!c || typeof t.target !== 'number') return null;
  /* A reader who may not read the aims (a person in it, where the check-in shows each person only their own) reads the count alone. */
  if (!againstTheAim) return theCountAlone(t, c, whose);
  const n = (x: number) => (c.counts === 'value' ? money(c.currency, x) : read(x));
  const of = whose === 'team' ? '' : whose === 'you' ? 'your ' : `${whose.label}'s `;
  const when = byWhen(t.name);
  const by = when ? ` by ${when}` : '';
  if (c.counts === 'new leads') {
    const week = c.window === 'week' ? ' this week' : '';
    const holder = whose === 'team' ? 'The team has' : whose === 'you' ? 'You have' : `${whose.label} has`;
    return {
      figure: read(c.count),
      of: `of ${of}${read(t.target)} new leads${week}`,
      says: `${holder} ${read(c.count)} new ${s(c.count, 'lead', 'leads')} on record${week}, and the aim is ${read(t.target)}.`,
    };
  }
  const thing = c.counts === 'value' ? '' : c.counts === 'sales' ? ' sales' : ` ${c.thing}`;
  const done = c.counts === 'sales' ? 'closed' : 'sold';
  const proof = c.proven != null && c.count > 0 ? `, ${n(c.proven)} with proof of payment` : '';
  const whoseThe = whose === 'team' ? 'the ' : of;
  const are = c.counts === 'value' ? 'is' : 'are';
  const aim = when ? ` The aim is to reach it by ${when}.` : '';
  return {
    figure: n(c.count),
    of: `of ${of}${n(t.target)}${thing} ${done}${by}${proof}`,
    says: c.count === 0
      ? `None of ${whoseThe}${n(t.target)}${thing} ${are} ${done} yet.${aim}`
      : `${n(c.count)} of ${whoseThe}${n(t.target)}${thing} ${are} ${done}${c.proven != null ? `, and proof of payment shows ${n(c.proven)}` : ''}.${aim}`,
  };
}

function theCountAlone(t: ASalesTarget, c: ATargetFromTheDeals, whose: WhoseTarget): AFigure {
  const n = (x: number) => (c.counts === 'value' ? money(c.currency, x) : read(x));
  const of = whose === 'team' ? 'the team\'s ' : whose === 'you' ? 'your ' : `${whose.label}'s `;
  const holder = whose === 'team' ? 'The team has' : whose === 'you' ? 'You have' : `${whose.label} has`;
  const when = byWhen(t.name);
  if (c.counts === 'new leads') {
    const week = c.window === 'week' ? ' this week' : '';
    return { figure: read(c.count), of: `${of}new leads${week}`, says: `${holder} ${read(c.count)} new ${s(c.count, 'lead', 'leads')} on record${week}.` };
  }
  const thing = c.counts === 'value' ? 'value' : c.counts === 'sales' ? 'sales' : c.thing;
  const done = c.counts === 'sales' ? 'closed' : 'sold';
  const proof = c.proven != null && c.count > 0 ? `, ${n(c.proven)} with proof of payment` : '';
  return {
    figure: n(c.count),
    of: `${of}${thing} ${done}${when ? ` by ${when}` : ''}${proof}`,
    says: c.count === 0
      ? `Nothing on record is ${done} yet.`
      : `${holder} ${done} ${n(c.count)}${c.counts === 'value' ? '' : ` ${c.counts === 'sales' ? s(c.count, 'sale', 'sales') : c.thing}`} so far${c.proven != null ? `, and proof of payment shows ${n(c.proven)}` : ''}.`,
  };
}
