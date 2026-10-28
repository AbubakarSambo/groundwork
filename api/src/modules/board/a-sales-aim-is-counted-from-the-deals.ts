import { aNumberPeopleCanRead } from './an-aim-is-a-sentence-about-somebody';
import { isADispatchNotADeal } from './each-deal-in-its-group';
import { proofNamesTheDeal } from './one-deal-per-customer';
import { RECORDS_FOR_EACH_KIND, stagesFor, plainFields } from './the-kind-of-work';
import { theMarkOf, whoAddedEachBackingDocument, WHAT_A_MARK_READS } from '../reports/how-a-line-is-known';
import { cleanText } from '../reports/what-the-record-actually-holds';
import { theStagesKept, type AStageOnRecord } from './a-deals-stages-are-kept';
import { theDealWasDropped, type ADroppedDeal } from './a-deal-that-was-dropped';
import { thePeopleAtEachCustomer } from './a-deal-that-has-stalled';
import { theBackingDocuments, theDocumentBehind, thePaymentRecords, theSignedOrders, aPaymentRecordFor, theMPesaCodeFor, theDepositFor, aDepositSaid, theTurnsBehindTheCodes, withTheSaleEachCodeAnswered, theSaleAsItsPaymentShowsIt, type ABackingDocument, type ADeposit } from './a-deals-proof-is-about-that-deal';
import { aLineIsAbout } from './a-deals-value-and-buying-date';
import { theDayTheyMeant } from '../grounds/when-a-handoff-is-due';
import { aDaySaidInFull } from './a-day-said-in-full';
import { theLeadSetTheRuleForASale } from './a-sale-counts-only-with-proof';

/**
 * A SALES AIM IS COUNTED FROM THE DEALS ON RECORD (Drop Access, 16 October 2026; Hafsah's answers of 17 October).
 *
 * Grace's board read "So far it is 25 of the 120 units sold" while two deals sat under Won, both with proof: Kilele Hotel,
 * 40 units, and Greenfield Supermarket, 25 units. The number came from a separate model read of what was said in the round,
 * which landed Greenfield's 25 and missed Kilele's 40; each rep's "units sold" read 0, and "New leads this week" read 0
 * beside eleven new customers on the board. Hafsah decided:
 *  1. "Proven won deals count into the target, unproven won deals count too, marked as their word", shown as the
 *     prototype's "21 sold, 17 with proof of payment" (docs/prototype/screens/B5-the-board/board-as-lead.txt).
 *  2. "Leads are counted from deals at their first stage."
 *
 * So, on a sales check-in, an aim whose words say what the deals hold is counted from the deals, never from a sentence:
 *  - units ("Units sold by 30 October", "Sell 40 units", "sell 120 water dispensers"): the Units kept with each deal at
 *    the last stage (Won), added up;
 *  - value ("KES 2,000,000 in sales", "revenue"): the Value kept with each such deal, added up, in its currency;
 *  - sales ("Reach 25 sales", "Close 10 deals"): how many deals are at the last stage;
 *  - new leads ("New leads this week", "Open 10 new leads weekly"): how many deals came onto the record, each at its first
 *    stage or later, in the aim's own window ("this week", "weekly": the working week so far, in the organisation's own
 *    time zone), or since the check-in began where no window is said.
 * A person's aim counts only the deals that are theirs. An aim whose words say none of these is left to the count it had.
 *
 * NEVER INVENTED. Every number is a sum of what the deals on record hold. A won deal with no units said is not guessed at:
 * it is left out of a count of units, and the sentence says how many were left out.
 */

export type WhatASalesAimCounts = 'units' | 'value' | 'sales' | 'new leads';

export interface WhatTheAimCounts {
  counts: WhatASalesAimCounts;
  /** "week": the working week so far (new leads). "month": one calendar month (`month`, 1 to 12, or null for this month). Null: since the check-in began. */
  window: 'week' | 'month' | null;
  /** The month a "month" window counts, 1 to 12, or null for the month `now` is in. */
  month?: number | null;
  /** What is counted, in the aim's own word: "units", "water dispensers", "sales". */
  thing: string;
}

const A_LEAD = /\bnew leads?\b|\b(?:open|opened|add|added|find|found|get|got|bring in)\s+(?:\d[\d,]*\s+)?(?:new\s+)?leads?\b|\bleads?\s+(?:opened|added|found)\b/i;
const A_WEEK = /\b(?:this|each|every|a|per)\s+week\b|\bweekly\b/i;
const MONEY = /\b(?:kes|ksh|ngn|usd|naira|shillings?|dollars?|revenue|turnover|sales value|value|worth)\b|[₦$£€]/i;
const SALES_OR_DEALS = /\b(\d[\d,]*\s+)?(?:sales|deals|orders)\b/i;
const UNITS = /\bunits?\b/i;
const A_SALE = /\b(?:sales?|sold|sell|selling|revenue|turnover|won|closed|deals?|orders?)\b/i;
/* "sell 120 water dispensers", "sold 40 freezers": what comes after the number. */
const SELL_A_THING = /\b(?:sell|sold|selling)\s+(?:\d[\d,]*)\s+([a-z][a-z ]{1,40}?)(?=\s+(?:by|in|this|before|for|each|every|per|a)\b|[.,;!?]|$)/i;

/** What a sales aim counts, read from its own words, or null where they say none of the things the deals hold. */
export function whatASalesAimCounts(name: string | null | undefined): WhatTheAimCounts | null {
  const t = String(name ?? '').trim();
  if (!t) return null;
  if (A_LEAD.test(t)) return { counts: 'new leads', window: A_WEEK.test(t) ? 'week' : null, thing: 'new leads' };
  /* Money counts from the deals only where the words say it is sold: "Naira disbursed" is a loan book, not a sale. */
  /* "7 units in November", "KES 300,000 this month": counted in that month only (quarter test, Faith's goal counted all time). */
  const inAMonth = theMonthItCounts(t);
  if (MONEY.test(t)) return A_SALE.test(t) ? { counts: 'value', ...inAMonth, thing: 'value' } : null;
  if (UNITS.test(t)) return { counts: 'units', ...inAMonth, thing: 'units' };
  if (SALES_OR_DEALS.test(t)) return { counts: 'sales', ...inAMonth, thing: 'sales' };
  const sold = t.match(SELL_A_THING);
  if (sold && !/\b(?:target|aim|goal)\b/i.test(sold[1])) return { counts: 'units', ...inAMonth, thing: sold[1].trim().toLowerCase() };
  return null;
}

export interface ADealOnRecord {
  id: string;
  name: string;
  stage: string | null;
  ownerParticipantId: string | null;
  fields: Record<string, string>;
  /** The day it first came onto the record. */
  firstOnRecordAt: Date;
  /** A document backs a line about it (the same rule the deal grid reads: the line it came from, or a line naming the customer). */
  proven: boolean;
  /**
   * A PAYMENT RECORD backs it (Hafsah's point 12, 17 October; "Won: paid, or a deposit received, with a payment record"): a line
   * about it, proven by a document or a reference typed in full, where the line or the document reads as a payment (an M-Pesa
   * message, a receipt, money received). A signed order is proof of the order, not of payment. What "with proof of payment"
   * counts. Where the caller has not asked for the rule (Release 1's switch off), it is `proven`, as before.
   */
  paid: boolean;
  /** Where the only payment records are a deposit (theDepositFor): backs the sale, never said as paid. */
  deposit?: ADeposit | null;
  /** Each stage it was put at, with its day, where they are kept (a-deals-stages-are-kept). Empty for a deal kept before. */
  stagesKept?: AStageOnRecord[];
  /** The day of the line its stage came from, or null for one added on the board. */
  stageSaidOn?: Date | null;
  /** The day of the first payment record about it, where the payment record is read (so a report can read it as of a day). */
  paidOn?: Date | null;
  /** Dropped: the customer turned it down, or the rep gave it up (a-deal-that-was-dropped). Not an open deal. */
  dropped?: ADroppedDeal | null;
  /** The people the record ties to the customer (thePeopleAtEachCustomer), whose answers are the customer's. */
  peopleThere?: string[];
  /** A SIGNED ORDER backs it (theSignedOrders), and no payment record yet. Only where the payment record is read. */
  signed?: boolean;
  /** A payment or a signed order on file for this deal itself: it is sold, whatever stage was written. Only where the payment record is read. */
  paymentOnFile?: boolean;
  /**
   * ALREADY OPEN BEFORE THIS CHECK-IN, so never a new lead (Hafsah's quality pass, 18 October, B-2): the lead named it in her own
   * check-in before anybody else did ("especially Kilele Hotel, Greenfield Supermarket, and Mama Pima Stores"), or its owner
   * spoke of it, the first time it came up, as one being followed up ("following up on the Tuskys Westgate lead").
   */
  alreadyOpen?: boolean;
  /** When the customer said they will pay, from the deal's own next step: "pays on delivery on Friday 16 October". */
  paysWhen?: string | null;
  /** The lead set the rule that a sale counts only with a payment or a signed order (a-sale-counts-only-with-proof). */
  wonNeedsProof?: boolean;
  /** The M-Pesa code typed for it, where that is its payment record (theMPesaCodeFor). Only where the payment record is read. */
  mpesaCode?: string | null;
  /**
   * THE DEAL AS IT WAS SOLD, where a payment record is about it (theSaleAsItsPaymentShowsIt; polish round 15, U2 and U14): its Units and
   * Value as the payment shows them. Whatever counts or says what was sold reads these (whatWasSold); the deal's own details stay as said.
   */
  soldFields?: Record<string, string> | null;
}

/** The details that say what a deal sold: as its payment shows them, where one does, otherwise as they were said. */
export const whatWasSold = (d: { fields?: Record<string, string> | null; soldFields?: Record<string, string> | null }): Record<string, string> => d.soldFields ?? d.fields ?? {};

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, a: 1, an: 1,
};

/** How many units a deal holds, from its Units detail ("40", "two", "40 units"), or null where none was said. */
export function theUnitsOf(fields: Record<string, string> | null | undefined): number | null {
  const said = Object.entries(fields ?? {}).find(([k]) => /^(?:units?|quantity|qty|how many)$/i.test(k.trim()))?.[1];
  if (!said) return null;
  const digits = String(said).replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  if (digits) return Number(digits[0]);
  const word = String(said).trim().toLowerCase().split(/[\s-]+/)[0];
  return NUMBER_WORDS[word] ?? null;
}

/** A deal's value, from its Value detail ("KES 200,000"): the currency as written and the amount. Null where none was said. */
export function theMoneyOf(fields: Record<string, string> | null | undefined): { currency: string; amount: number } | null {
  const said = Object.entries(fields ?? {}).find(([k]) => /^(?:deal\s+)?(?:value|amount|worth|size)$/i.test(k.trim()))?.[1];
  if (!said) return null;
  const m = String(said).match(/([A-Za-z₦$£€]{0,4})\s*([\d][\d,]*(?:\.\d+)?)\s*(million|m|k|thousand)?/i);
  if (!m) return null;
  let amount = Number(m[2].replace(/,/g, ''));
  const scale = (m[3] ?? '').toLowerCase();
  if (scale === 'million' || scale === 'm') amount *= 1e6;
  if (scale === 'thousand' || scale === 'k') amount *= 1e3;
  return Number.isFinite(amount) ? { currency: (m[1] ?? '').toUpperCase(), amount } : null;
}

export interface ACountFromTheDeals {
  counts: WhatASalesAimCounts;
  /** The number the aim stands at: units, value, sales or new leads. */
  count: number;
  /** Of it, what proof of payment shows. Null for new leads. */
  proven: number | null;
  /**
   * Of the rest, what a document backs that is not a payment (a signed order): proof of the order, not of the payment, and never
   * the seller's word alone (Hafsah's point 12). Only where the payment record is read; otherwise 0.
   */
  shown?: number;
  /** Deals at the last stage that could not be counted (no units or no value said). */
  leftOut: number;
  /** What is counted, in the aim's own word. */
  thing: string;
  /** For value: the currency, as the deals write it ("KES"). */
  currency: string | null;
  /** "week": a count that starts again each working week, so it is never carried forward at a pace. */
  window?: 'week' | 'month' | null;
  /**
   * WHICH DEALS MAKE THE COUNT, by name (Hafsah's quality pass, 18 October, Q1): those a payment record backs, those a signed order
   * backs, and those that rest on what somebody said. Only where the payment record is read (Release 1's sales board).
   */
  paidDeals?: { name: string; holds: number }[];
  /** Backed by a deposit only: sold, and not paid in full (item 10 of the final check). */
  depositDeals?: { name: string; holds: number; deposit: ADeposit }[];
  /** What those deals hold, in the aim's measure. */
  deposit?: number;
  signedDeals?: { name: string; holds: number; paysWhen: string | null }[];
  saidDeals?: { name: string; holds: number }[];
  /** Said to be won, and not counted, because the lead's rule needs a payment or a signed order and neither is on record. */
  notCountedDeals?: { name: string; holds: number }[];
  /** The prototype's line: "65 sold, 40 with proof of payment", or "11 new leads this week", in a full sentence where it needs one. */
  says: string;
}

const dayKeyIn = (d: Date, zone: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
/** The month an aim's own words count in: a month named ("in November", "November collections"), or "this month", "a month", "monthly". */
export function theMonthItCounts(t: string): { window: 'month' | null; month: number | null } {
  /* "in November", "during November", "November sales": that month. "by 30 October" is a deadline, not a month to count in. */
  const M = MONTH_NAMES.join('|');
  const named = new RegExp(`\\b(?:in|during|for)\\s+(?:the\\s+month\\s+of\\s+)?(${M})\\b`, 'i').exec(t)
    ?? new RegExp(`(?:^|[^a-z0-9]\\s*)(${M})\\s+(?:sales|collections|target|units|revenue|orders|deals)\\b`, 'i').exec(t);
  if (named) return { window: 'month', month: MONTH_NAMES.indexOf(named[1].toLowerCase()) + 1 };
  if (/\b(?:this|each|every|a|per)\s+month\b|\bmonthly\b/i.test(t)) return { window: 'month', month: null };
  return { window: null, month: null };
}

/** The first and last day keys of the month an aim counts in, in the zone: the latest such month that has begun by `now`. */
export function theMonthsDays(month: number | null, now: Date, zone: string): { from: string; to: string } {
  const today = dayKeyIn(now, zone);
  const y = Number(today.slice(0, 4));
  const m = month ?? Number(today.slice(5, 7));
  const year = m > Number(today.slice(5, 7)) ? y - 1 : y;
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, '0');
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(last).padStart(2, '0')}` };
}

/** The day a won deal was won: its first payment record, else the day it reached its last stage, else the day its stage was said. */
function theDayItWasWon(d: ADealOnRecord, last: string): Date {
  const atLast = (d.stagesKept ?? []).filter((s: any) => String(s.stage ?? '').toLowerCase() === last).map((s: any) => new Date(s.at ?? s.on ?? s.createdAt)).filter((x) => !Number.isNaN(x.getTime()));
  return d.paidOn ?? atLast[0] ?? d.stageSaidOn ?? d.firstOnRecordAt;
}

/** The Monday of the working week `now` falls in, as a day key in the zone. */
export function theMondayOf(now: Date, zone: string): string {
  const key = dayKeyIn(now, zone);
  const noon = new Date(`${key}T12:00:00Z`);
  const back = (noon.getUTCDay() + 6) % 7;
  return new Date(noon.getTime() - back * 86_400_000).toISOString().slice(0, 10);
}

const read = aNumberPeopleCanRead;
const money = (currency: string | null, n: number) => (currency ? `${currency} ${read(n)}` : read(n));

/**
 * One aim, counted from the deals. `stages` are the check-in's own (its first is where a lead starts, its last is won).
 * Null where the aim's words say none of the things deals hold.
 */
export function theCountFromTheDeals(
  aim: { name: string | null | undefined; ownerParticipantId?: string | null },
  deals: ADealOnRecord[],
  stages: string[],
  now: Date,
  zone: string,
): ACountFromTheDeals | null {
  const what = whatASalesAimCounts(aim.name);
  if (!what || !stages.length) return null;
  const theirs = deals.filter((d) => !aim.ownerParticipantId || d.ownerParticipantId === aim.ownerParticipantId);
  if (what.counts === 'new leads') {
    const from = what.window === 'week' ? theMondayOf(now, zone) : null;
    const to = dayKeyIn(now, zone);
    const leads = theirs.filter((d) => {
      if (d.alreadyOpen) return false;
      const k = dayKeyIn(d.firstOnRecordAt, zone);
      return k <= to && (!from || k >= from);
    }).length;
    const when = what.window === 'week' ? ' this week' : '';
    return {
      counts: 'new leads', count: leads, proven: null, leftOut: 0, thing: 'new leads', currency: null, window: what.window,
      says: leads === 1 ? `1 new lead came onto the record${when}.` : `${read(leads)} new leads came onto the record${when}.`,
    };
  }
  const last = stages[stages.length - 1].toLowerCase();
  /*
   * A DEAL WITH ITS PAYMENT OR ITS SIGNED ORDER ON FILE IS SOLD, WHATEVER STAGE WAS WRITTEN FOR IT (polish round 1, 26 October 2026).
   * Kevin's Kilele Hotel had the M-Pesa statement for its 40 units on file, but no stage, and Grace's board read "0 of 120 sold".
   */
  const atTheLast = theirs.filter((d) => (d.stage ?? '').toLowerCase() === last || !!d.paymentOnFile);
  /* Where the lead's rule says a sale counts only with a payment or a signed order, one said won with neither is not counted yet. */
  const notYet = (d: ADealOnRecord) => !!d.wonNeedsProof && !d.paid && !d.signed;
  /* An aim for one month counts only what was won in that month. */
  const days = what.window === 'month' ? theMonthsDays(what.month ?? null, now, zone) : null;
  const inTheWindow = (d: ADealOnRecord) => !days || ((k) => k >= days.from && k <= days.to)(dayKeyIn(theDayItWasWon(d, last), zone));
  const won = atTheLast.filter((d) => !notYet(d) && inTheWindow(d));
  const notCountedDeals = atTheLast.filter(notYet).map((d) => ({
    name: d.name,
    holds: what.counts === 'units' ? (theUnitsOf(whatWasSold(d)) ?? 0) : what.counts === 'value' ? (theMoneyOf(whatWasSold(d))?.amount ?? 0) : 1,
  }));
  let count = 0;
  let proven = 0;
  let shown = 0;
  let leftOut = 0;
  let currency: string | null = null;
  const paidDeals: { name: string; holds: number }[] = [];
  const depositDeals: { name: string; holds: number; deposit: ADeposit }[] = [];
  const signedDeals: { name: string; holds: number; paysWhen: string | null }[] = [];
  const saidDeals: { name: string; holds: number }[] = [];
  const named = deals.some((d) => d.signed !== undefined);
  /* Paid in full: a payment record, and not a deposit only. */
  const paidInFull = (d: ADealOnRecord) => d.paid && !d.deposit;
  let deposit = 0;
  const sortInto = (d: ADealOnRecord, holds: number) => {
    if (d.paid && d.deposit) { depositDeals.push({ name: d.name, holds, deposit: d.deposit }); deposit += holds; }
    else if (d.paid) paidDeals.push({ name: d.name, holds });
    else if (d.proven && d.signed) signedDeals.push({ name: d.name, holds, paysWhen: d.paysWhen ?? null });
    else if (!d.proven) saidDeals.push({ name: d.name, holds });
  };
  if (what.counts === 'value') {
    const each = won.map((d) => ({ d, m: theMoneyOf(whatWasSold(d)) }));
    const currencies = each.map((x) => x.m?.currency ?? '').filter(Boolean);
    currency = currencies.sort((a, b) => currencies.filter((c) => c === b).length - currencies.filter((c) => c === a).length)[0] ?? null;
    for (const { d, m } of each) {
      if (!m || (currency && m.currency && m.currency !== currency)) { leftOut += 1; continue; }
      count += m.amount;
      if (paidInFull(d)) proven += m.amount;
      else if (d.proven) shown += m.amount;
      sortInto(d, m.amount);
    }
  } else if (what.counts === 'units') {
    for (const d of won) {
      const u = theUnitsOf(whatWasSold(d));
      if (u == null) { leftOut += 1; continue; }
      count += u;
      if (paidInFull(d)) proven += u;
      else if (d.proven || d.paid) shown += u;
      sortInto(d, u);
    }
  } else {
    count = won.length;
    proven = won.filter(paidInFull).length;
    shown = won.filter((d) => !paidInFull(d) && (d.proven || d.paid)).length;
    for (const d of won) sortInto(d, 1);
  }
  const onADeposit = deposit ? (what.counts === 'value' ? `, and ${money(currency, deposit)} on a deposit` : `, and ${read(deposit)} on a deposit`) : '';
  const said = count === 0
    ? 'Nothing has been sold yet.'
    : what.counts === 'value'
      ? `${money(currency, count)} sold, ${money(currency, proven)} with proof of payment${onADeposit}.`
      : `${read(count)} sold, ${read(proven)} with proof of payment${onADeposit}.`;
  const unsaid = what.counts === 'value' ? 'what it is worth' : 'how many units';
  const out = leftOut
    ? ` ${leftOut === 1 ? '1 won deal has' : `${read(leftOut)} won deals have`} no record of ${unsaid}, so ${leftOut === 1 ? 'it is' : 'they are'} not counted.`
    : '';
  return {
    counts: what.counts, count, proven, shown, leftOut, thing: what.thing, currency, says: `${said}${out}`,
    ...(named ? { paidDeals, signedDeals, saidDeals, ...(depositDeals.length ? { depositDeals, deposit } : {}) } : {}),
    ...(notCountedDeals.length ? { notCountedDeals } : {}),
  };
}

/**
 * EVERY DEAL THE COUNT IS MADE OF, by name: paid, on a deposit, on a signed order, and on somebody's word (polish round 15, U1). The
 * forecast's "The 51 sold came from two orders, Kilele and Ngong Road Minimart" left out Savannah Cafe, which was on a deposit, because
 * each reader listed the deals by hand and forgot the deposit.
 */
export function theDealsTheCountIsMadeOf(c: Pick<ACountFromTheDeals, 'paidDeals' | 'depositDeals' | 'signedDeals' | 'saidDeals'>): { name: string; holds: number }[] {
  return [...(c.paidDeals ?? []), ...(c.depositDeals ?? []), ...(c.signedDeals ?? []), ...(c.saidDeals ?? [])];
}

/**
 * WHERE A WEEKLY COUNT STANDS. A count that starts again each week cannot be carried forward at a pace across the check-in
 * ("about 51 by the last session" was said of 11 new leads this week): it is said where it is this week, against its number.
 */
export function whereAWeeklyCountStands(count: number, target: number): { word: 'Met' | null; says: string } {
  return count >= target
    ? { word: 'Met', says: `It is ${read(count)} this week, so the aim of ${read(target)} a week has been reached.` }
    : { word: null, says: `It is ${read(count)} so far this week, and the aim is ${read(target)} a week. It starts again each week, so it is not carried forward at a pace.` };
}

/**
 * THE HEADLINE'S ANSWER FOR AN AIM COUNTED FROM THE DEALS, in the prototype's shape: "Not yet. 21 freezers are sold and 2
 * more are likely. That makes 23 of the 25 needed." `likely` is what the deals under "Likely" hold, in the same measure.
 */
export function theSalesAnswer(c: ACountFromTheDeals, target: number, likely: number): string {
  const n = (v: number) => (c.counts === 'value' ? money(c.currency, v) : read(v));
  const many = (v: number) => c.counts === 'value' || v !== 1;
  const thing = c.counts === 'value' ? '' : ` ${c.counts === 'sales' ? (c.count === 1 ? 'sale' : 'sales') : (c.count === 1 && c.thing === 'units' ? 'unit' : c.thing)}`;
  const sold = c.counts === 'value'
    ? `${n(c.count)} is sold`
    : `${n(c.count)}${thing} ${many(c.count) ? 'are' : 'is'} ${c.counts === 'sales' ? 'closed' : 'sold'}`;
  /* "Greenfield Supermarket's 25 units are not counted yet, because a sale counts only with a payment or a signed order." */
  const notCounted = (c.notCountedDeals ?? []).length
    ? ` ${(() => {
      const xs = c.notCountedDeals!;
      const ns = xs.map((x) => x.name);
      const names = ns.length <= 1 ? ns.join('') : `${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`;
      const holds = xs.reduce((t, x) => t + x.holds, 0);
      /* Two or more: "The 18 units of Mama Pima Stores and a shop in Githurai are", never "Mama Pima Stores and a shop in Githurai 18 units are" (final check). */
      const what = c.counts === 'units' && holds > 0
        ? (xs.length === 1 ? `${names}'s ${read(holds)} ${holds === 1 ? 'unit is' : 'units are'}` : `the ${read(holds)} ${holds === 1 ? 'unit' : 'units'} of ${names} are`)
        : `${names} ${xs.length === 1 ? 'is' : 'are'}`;
      return `${what.charAt(0).toUpperCase()}${what.slice(1)} not counted yet, because a sale counts only with a payment or a signed order.`;
    })()}`
    : '';
  if (c.count >= target) return `Yes. ${sold}, and ${n(target)} were needed.${notCounted}`;
  /*
   * WHICH DEALS THE NUMBER IS, AND WHAT PROVES EACH (Hafsah's quality pass, 18 October, Q1): "Not yet. 65 of the 120 units are sold.
   * 40 are paid (Kilele Hotel) and 25 are on a signed order (Greenfield Supermarket), which pays on delivery on Friday 16 October."
   * Only where the deals are named (the payment record read), and only once something is sold.
   */
  if (c.count > 0 && (c.paidDeals || c.signedDeals || c.saidDeals)) {
    const thingOfTarget = c.counts === 'value' ? '' : ` ${c.counts === 'sales' ? 'sales' : c.thing}`;
    const of = c.counts === 'value'
      ? `${n(c.count)} of the ${n(target)} is sold.`
      : `${read(c.count)} of the ${read(target)}${thingOfTarget} ${many(c.count) ? 'are' : 'is'} ${c.counts === 'sales' ? 'closed' : 'sold'}.`;
    /* An amount of money is one thing: "KES 265,000 is paid", never "are" (polish round 15). */
    const isOrAre = (v: number) => (c.counts !== 'value' && many(v) ? 'are' : 'is');
    const sum = (xs: { holds: number }[]) => xs.reduce((t, x) => t + x.holds, 0);
    const names = (xs: { name: string }[]) => {
      const ns = xs.map((x) => x.name);
      return ns.length <= 1 ? ns.join('') : `${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`;
    };
    const parts: string[] = [];
    const paid = c.paidDeals ?? [];
    const signed = c.signedDeals ?? [];
    const said = c.saidDeals ?? [];
    if (paid.length) parts.push(`${n(sum(paid))} ${isOrAre(sum(paid))} paid (${names(paid)})`);
    const deposits = c.depositDeals ?? [];
    if (deposits.length) parts.push(`${n(sum(deposits))} ${isOrAre(sum(deposits))} on a deposit (${deposits.map((x) => `${x.name}, ${aDepositSaid(x.deposit).replace(/^Deposit paid, /, '').replace(/\.$/, '')} paid`).join('; ')})`);
    if (signed.length) {
      const pays = signed.length === 1 && signed[0].paysWhen ? `, which ${signed[0].paysWhen}` : '';
      parts.push(`${n(sum(signed))} ${isOrAre(sum(signed))} on a signed order (${names(signed)})${pays}`);
    }
    if (said.length) parts.push(`${n(sum(said))} ${c.counts !== 'value' && many(sum(said)) ? 'rest' : 'rests'} on what somebody said (${names(said)})`);
    const proof = parts.length ? ` ${parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`}.` : '';
    const more = likely > 0
      ? ` ${c.counts === 'value' ? `${n(likely)} more is likely` : `${n(likely)} more ${likely === 1 ? 'is' : 'are'} likely`}, which makes ${n(c.count + likely)} of the ${n(target)} needed.`
      : '';
    return `Not yet. ${of}${proof}${notCounted}${more}`;
  }
  if (likely > 0) {
    const more = c.counts === 'value' ? `${n(likely)} more is likely` : `${n(likely)} more ${likely === 1 ? 'is' : 'are'} likely`;
    return `Not yet. ${sold} and ${more}.${notCounted} That makes ${n(c.count + likely)} of the ${n(target)} needed.`;
  }
  return `Not yet. ${sold}, and no more are likely yet.${notCounted} That is ${n(c.count)} of the ${n(target)} needed.`;
}

/** What the deals under one group hold, in the aim's measure. */
export function whatTheseDealsHold(counts: WhatASalesAimCounts, rows: { fields?: Record<string, string> | null }[], currency: string | null): number {
  if (counts === 'sales') return rows.length;
  if (counts === 'units') return rows.reduce((s, r) => s + (theUnitsOf(r.fields ?? {}) ?? 0), 0);
  if (counts === 'value') return rows.reduce((s, r) => { const m = theMoneyOf(r.fields ?? {}); return s + (m && (!currency || !m.currency || m.currency === currency) ? m.amount : 0); }, 0);
  return 0;
}

/**
 * THE DEALS ON RECORD FOR ONE CHECK-IN, as every count above reads them: the same rows the deal grid is built from (a deal
 * whose line was disputed is left out, a delivery of stock is not a deal), owned by whoever said the line it came from, and
 * proven by the same rule the grid uses. Read only.
 */
export async function theDealsOnRecord(prisma: any, groundId: string, opts: { paymentRecord?: boolean; ourSide?: readonly string[] } = {}): Promise<ADealOnRecord[]> {
  const items = ((await (prisma.workItem?.findMany?.({ where: { groundId, kind: 'deal' }, orderBy: { createdAt: 'asc' } }) ?? Promise.resolve([])).catch(() => [])) ?? []) as any[];
  if (!items.length) return [];
  const lines = ((await (prisma.recordEntry?.findMany?.({
    where: { disputedAt: null, participant: { groundId } },
    select: { id: true, text: true, type: true, participantId: true, createdAt: true, checkInId: true, ...WHAT_A_MARK_READS },
  }) ?? Promise.resolve([])).catch(() => [])) ?? []) as any[];
  const byId = new Map(lines.map((l) => [l.id, l]));
  /* Whoever runs the check-in: a deal she named first was already open (B-2). */
  const theGround = opts.paymentRecord
    ? await Promise.resolve(prisma.ground?.findUnique?.({ where: { id: groundId }, select: { initiatorId: true, participants: { select: { id: true, userId: true, partyType: true } } } })).catch(() => null)
    : null;
  const leadRows = new Set(((theGround?.participants ?? []) as any[]).filter((p) => p.partyType === 'INITIATOR' || (!!theGround?.initiatorId && p.userId === theGround.initiatorId)).map((p) => p.id));
  /* Her rule that a sale counts only with a payment or a signed order (a-sale-counts-only-with-proof), read where the payment record is. */
  const wonNeedsProof = opts.paymentRecord ? await theLeadSetTheRuleForASale(prisma, groundId, theGround).catch(() => false) : false;
  const whoAdded = await whoAddedEachBackingDocument(prisma, lines).catch(() => new Map<string, string | null>());
  /* The documents behind the lines: proof counts for the customer the document names (a-deals-proof-is-about-that-deal). */
  const docOf = await theBackingDocuments(prisma, lines).catch(() => new Map<string, ABackingDocument>());
  /*
   * A code typed as the answer to "What shows the sale of those two units?" is read with the sale it was asked for (polish round 15, U14;
   * withTheSaleEachCodeAnswered). Only for the payment records: every other reading of a line reads it as it was said.
   */
  const asProof: any[] = opts.paymentRecord
    ? withTheSaleEachCodeAnswered(
      lines.map((l) => ({ ...l, text: cleanText(l.text ?? '') })),
      await theTurnsBehindTheCodes(prisma, lines.map((l) => ({ ...l, text: cleanText(l.text ?? '') }))).catch(() => []),
      items.map((i) => ({ name: i.name, fields: plainFields(i.fields), ownerParticipantId: (i.sourceEntryId ? byId.get(i.sourceEntryId)?.participantId : null) ?? i.ownerParticipantId ?? null })),
    )
    : lines;
  const marked = asProof.map((l) => ({
    text: cleanText(l.text ?? ''),
    mark: theMarkOf({ ...l, text: cleanText(l.text ?? '') }, whoAdded) as string,
    documentBy: l.anchoredDocumentId ? (whoAdded.get(l.anchoredDocumentId) ?? null) : null,
    documentWords: theDocumentBehind(l.anchoredDocumentId, docOf).documentWords,
  }));
  /* The payment records: a document that reads as a payment, or a reference typed in full, each about the customer it names (the board's own rule). */
  const payments: { text: string; at: Date }[] = opts.paymentRecord
    ? thePaymentRecords(
      asProof
        .filter((l) => theMarkOf({ ...l, text: cleanText(l.text ?? '') }, whoAdded) === 'proven')
        .map((l) => ({ text: cleanText(l.text ?? ''), createdAt: l.createdAt, anchoredDocumentId: l.anchoredDocumentId ?? null })),
      docOf,
    )
    : [];
  /* The payment records a document shows, so a code typed beside an M-Pesa message is not said as the proof. */
  const documentPayments: { text: string; at: Date }[] = opts.paymentRecord
    ? thePaymentRecords(
      lines
        .filter((l) => !!l.anchoredDocumentId && theMarkOf({ ...l, text: cleanText(l.text ?? '') }, whoAdded) === 'proven')
        .map((l) => ({ text: cleanText(l.text ?? ''), createdAt: l.createdAt, anchoredDocumentId: l.anchoredDocumentId ?? null })),
      docOf,
    )
    : [];
  const signedOrders: { text: string; at: Date }[] = opts.paymentRecord
    ? theSignedOrders(
      lines
        .filter((l) => theMarkOf({ ...l, text: cleanText(l.text ?? '') }, whoAdded) === 'proven')
        .map((l) => ({ text: cleanText(l.text ?? ''), createdAt: l.createdAt, anchoredDocumentId: l.anchoredDocumentId ?? null })),
      docOf,
    )
    : [];
  /*
   * PROOF FILED ON THE DEAL ITSELF IS ITS PROOF (engine test, second run, Drop Access, Friday 16 October). Kevin sent
   * mpesa-savannah-deposit.pdf in his check-in at 11:01 ("RBT7Y3KQ2P Confirmed. Ksh15,000.00 received from JANE MWENDE ... Ref: deposit 6
   * dispensers."), and it was read and filed on Savannah Cafe as "A payment" (proof-filed-on-its-item.ts). No line of his was anchored to
   * it, because the message names Jane, not the cafe, so this read nothing of it, and the weekly report built at 11:15 said "Savannah Cafe
   * bought. Nothing written shows it yet, only what Kevin Omondi said." The evidence row filed on the deal is read here: a payment filed on
   * it is its payment record, a signed order its signed order, and either backs it. Only where the payment record is read.
   */
  const filed: { workItemId: string; readAs: string; createdAt: Date }[] = opts.paymentRecord
    ? (((await Promise.resolve(prisma.itemEvidence?.findMany?.({
      where: { groundId, workItemId: { in: items.map((i) => i.id) }, countsAsProof: true },
      select: { workItemId: true, readAs: true, createdAt: true },
    })).catch(() => [])) ?? []) as any[]).map((e) => ({ workItemId: String(e.workItemId), readAs: String(e.readAs ?? ''), createdAt: new Date(e.createdAt) }))
    : [];
  const filedOn = (id: string, readAs: string) => filed.filter((e) => e.workItemId === id && e.readAs === readAs).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const out: ADealOnRecord[] = [];
  /* With Release 1's rules (the payment record read), the people at each customer and whether each deal was dropped, as the board reads them. */
  const peopleAt = opts.paymentRecord
    ? await thePeopleAtEachCustomer(prisma, groundId, items.map((i) => ({ id: i.id, name: i.name, ownerParticipantId: (i.sourceEntryId ? byId.get(i.sourceEntryId)?.participantId : null) ?? i.ownerParticipantId ?? null })), opts.ourSide ?? []).catch(() => new Map<string, string[]>())
    : new Map<string, string[]>();
  const stagesHere = theSalesStages(null);
  for (const i of items) {
    const line = i.sourceEntryId ? byId.get(i.sourceEntryId) : null;
    if (i.sourceEntryId && !line) continue;
    if (isADispatchNotADeal({ name: i.name, said: line ? cleanText(line.text ?? '') : '' } as any)) continue;
    const owner: string | null = line?.participantId ?? i.ownerParticipantId ?? null;
    const sourceMark = line ? theMarkOf({ ...line, text: cleanText(line.text ?? '') }, whoAdded) : null;
    const paymentFiled = filedOn(i.id, 'A payment');
    const orderFiled = filedOn(i.id, 'A signed order');
    const proven = sourceMark === 'proven' || proofNamesTheDeal(i.name, marked, owner) || paymentFiled.length > 0 || orderFiled.length > 0;
    const said = plainFields(i.fields);
    const paidOnALine = opts.paymentRecord ? payments.filter((t) => aPaymentRecordFor({ name: i.name, fields: said }, [t])).map((t) => t.at) : [];
    /*
     * What was sold is what its payment shows: the units the payment was for, and what was paid (U2, U14). Kept beside the deal's own
     * details, which only take a value where they had none.
     */
    const soldFields = opts.paymentRecord && paidOnALine.length ? theSaleAsItsPaymentShowsIt({ name: i.name, fields: said }, payments) : null;
    const hasAValue = Object.keys(said).some((k) => /^(?:deal\s+)?(?:value|amount|worth|size)$/i.test(k.trim()));
    const fields = soldFields?.Value && !hasAValue ? { ...said, Value: soldFields.Value } : said;
    out.push({
      id: i.id,
      name: i.name,
      stage: i.stage ?? null,
      ownerParticipantId: owner,
      fields,
      firstOnRecordAt: new Date(i.createdAt),
      proven,
      paid: opts.paymentRecord ? paidOnALine.length > 0 || paymentFiled.length > 0 : proven,
      paymentOnFile: !!opts.paymentRecord && (paidOnALine.length > 0 || paymentFiled.length > 0 || orderFiled.length > 0),
      /* Only the payment records on the lines can say a deposit; a payment filed on the deal is read as paid, as before. */
      deposit: opts.paymentRecord && paidOnALine.length && !paymentFiled.length ? theDepositFor({ name: i.name, fields: soldFields ?? fields }, payments) : null,
      ...(soldFields ? { soldFields } : {}),
      paidOn: opts.paymentRecord
        ? [...paidOnALine, ...paymentFiled.map((e) => e.createdAt)].sort((a, b) => a.getTime() - b.getTime())[0] ?? null
        : null,
      stagesKept: theStagesKept(i.fields),
      stageSaidOn: line?.createdAt ? new Date(line.createdAt) : null,
      ...(opts.paymentRecord ? {
        signed: aPaymentRecordFor({ name: i.name, fields }, signedOrders) || orderFiled.length > 0,
        ...(wonNeedsProof ? { wonNeedsProof: true } : {}),
        /* Only where no document shows the payment: an M-Pesa message sent is said as before. */
        mpesaCode: aPaymentRecordFor({ name: i.name, fields }, documentPayments) || paymentFiled.length > 0 ? null : theMPesaCodeFor({ name: i.name, fields }, asProof
          .filter((l) => theMarkOf({ ...l, text: cleanText(l.text ?? '') }, whoAdded) === 'proven')
          .map((l) => ({ text: cleanText(l.text ?? ''), anchoredDocumentId: l.anchoredDocumentId ?? null }))),
        alreadyOpen: wasAlreadyOpen({ name: i.name, fields, createdAt: new Date(i.createdAt) }, lines.map((l) => ({ ...l, text: cleanText(l.text ?? '') })), leadRows),
        paysWhen: whenTheyPay(fields, lines.filter((l) => !owner || l.participantId === owner).map((l) => ({ text: cleanText(l.text ?? ''), createdAt: new Date(l.createdAt) }))),
        peopleThere: peopleAt.get(i.id) ?? [],
        dropped: theDealWasDropped({ name: i.name, stage: i.stage ?? null, ownerParticipantId: owner, fields }, lines, { lastStage: stagesHere[stagesHere.length - 1] ?? null, peopleThere: peopleAt.get(i.id) ?? [], saidInTheCheckIn: (i.fields as any)?._dropped ?? null, otherDeals: items.map((x) => String(x.name ?? '')) }),
      } : {}),
    });
  }
  return out;
}

const FOLLOWED_UP = /\bfollow(?:ing|ed)?[\s-]+up\s+(?:on|with)\b/i;

/**
 * WHETHER A DEAL WAS ALREADY OPEN WHEN THIS CHECK-IN BEGAN, so it is not a new lead (Hafsah's quality pass, 18 October, B-2). From
 * the record only: the first lines that name it are by whoever runs the check-in (she named it as a deal under way), or, in the
 * check-in where it first came up, its lines say it is being followed up ("following up on the Tuskys Westgate lead").
 */
export function wasAlreadyOpen(
  deal: { name: string; fields?: Record<string, string> | null; createdAt: Date },
  lines: readonly { text: string; participantId: string | null; createdAt: Date | string; checkInId?: string | null }[],
  leadRows: ReadonlySet<string>,
): boolean {
  const about = lines
    .filter((l) => aLineIsAbout(l.text, { name: deal.name, fields: null }))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  if (!about.length) return false;
  const first = about[0];
  if (first.participantId && leadRows.has(first.participantId)) return true;
  const sameCheckIn = about.filter((l) => (first.checkInId ? l.checkInId === first.checkInId : l === first));
  return sameCheckIn.some((l) => FOLLOWED_UP.test(l.text) && new RegExp(`${FOLLOWED_UP.source}[^.]{0,40}${deal.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(l.text));
}

/**
 * WHEN THE CUSTOMER SAID THEY WILL PAY, from the deal's own next step where it says so ("Delivery is set for Friday, and they'll
 * pay then."): "pays on delivery on Friday 16 October", the day read from the day the owner said it. Null where the next step says
 * nothing of paying.
 */
export function whenTheyPay(fields: Record<string, string> | null | undefined, ownersLines: readonly { text: string; createdAt: Date }[]): string | null {
  const step = String(fields?.['Next step'] ?? '').trim();
  if (!step || !/\bpa(?:y|ys|ying|id)\b/i.test(step)) return null;
  const key = step.toLowerCase().slice(0, 24);
  const said = ownersLines.filter((l) => l.text.toLowerCase().includes(key)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  const day = said ? theDayTheyMeant(step, said.createdAt) : null;
  const onDelivery = /\bdeliver/i.test(step) && /\bthen\b|\bon delivery\b/i.test(step);
  if (onDelivery) return day ? `pays on delivery on ${aDaySaidInFull(day)}` : 'pays on delivery';
  return day ? `pays on ${aDaySaidInFull(day)}` : null;
}

/** The deal stages this check-in uses: the lead's own, or a sales team's. */
export function theSalesStages(leadsOwn: unknown): string[] {
  const grid = RECORDS_FOR_EACH_KIND['sales org'].find((s) => s.itemKinds.includes('deal'));
  return (grid ? stagesFor(grid, leadsOwn) : undefined) ?? [];
}

/** Every aim of one check-in that the deals count, by its id. */
export function theAimsTheDealsCount(
  aims: { id: string; name: string | null | undefined; ownerParticipantId?: string | null }[],
  deals: ADealOnRecord[],
  stages: string[],
  now: Date,
  zone: string,
): Map<string, ACountFromTheDeals> {
  const out = new Map<string, ACountFromTheDeals>();
  for (const a of aims) {
    const c = theCountFromTheDeals(a, deals, stages, now, zone);
    if (c) out.set(a.id, c);
  }
  return out;
}
