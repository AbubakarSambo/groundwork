import { theUnitsOf, theMoneyOf } from './a-sales-aim-is-counted-from-the-deals';
import { theContactOf } from './a-deal-that-has-stalled';

/**
 * A DEAL'S VALUE AND ITS BUYING DATE, FROM WHAT WAS SAID (Hafsah's points 5 and 6, 17 October; Drop Access).
 *
 * VALUE (point 5). Grace's grid read "Joseph, KES 4,500" for Juja Hardware and "KES 12,000" for Mama Pima Stores. Joseph had
 * said "the KES 4,500 price for Juja Hardware", the price of one unit, and "the KES 12,000 discount for Mama Pima", a discount
 * the customer asked for. Neither is what the deal is worth. A deal's value is the whole amount: said as the whole ("a quote for
 * KES 30,000", "25 units, which comes to 125,000 shillings"), or worked out as units times the price of one unit where both are
 * on record. Where only a price for one unit is on record, or only a discount, the value is unknown, and the price or the
 * discount is kept under its own name.
 *
 * BUYING DATE (point 6). Mercy said "Rose said she will buy the two units at the end of the month, on October 30th." Rose is
 * the Mama Mboga Mart deal's contact. That is the customer's buying date, filed on the deal as "Buying date", never as Mercy's
 * own commitment. A line is about a deal when it names the customer or the person they deal with there.
 */

/* ----------------------------------------------------------------------------------------------- the value */

const AMOUNT = /(?:\b(?:kes|ksh|kshs|ngn|usd|ghs|zar)\b\.?\s*|[₦$£€]\s?)?(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*(?:k\b|thousand\b)?(?:\s*(?:shillings?|naira|dollars?|bob)\b)?/gi;
/* Said straight after the amount: "the KES 4,500 price", "4,500 each", "4,500 a unit", "12,000 discount". */
const CALLED_A_PRICE_AFTER = /^\s*(?:(?:unit\s+)?price\b|each\b|apiece\b|per\s+(?:unit|piece|item|one|dispenser|bag|box)\b|a\s+(?:unit|piece|item|dispenser|bag|box)\b|for\s+(?:one|each)\b)/i;
const CALLED_A_DISCOUNT_AFTER = /^\s*(?:discount|off|rebate|reduction)\b/i;
/* Said just before it: "a price of KES 4,500", "priced at 4,500", "a discount of 12,000". */
const CALLED_A_PRICE_BEFORE = /\b(?:(?:unit\s+)?price(?:\s+(?:of|is|was|at))?|priced\s+at|each\s+at|per\s+unit(?:\s+(?:of|is|at))?)\s*$/i;
const CALLED_A_DISCOUNT_BEFORE = /\bdiscount(?:\s+(?:of|is|was))?\s*$/i;

const theNumber = (s: string): number | null => {
  const m = String(s ?? '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
};

export type WhatAnAmountIs = 'price each' | 'discount' | 'whole';

/** What a line calls an amount: the price of one unit, a discount, or (anything else) a whole amount. Null where the line does not say it. */
export function whatTheLineCallsIt(line: string, amount: number): WhatAnAmountIs | null {
  const text = String(line ?? '');
  let found: WhatAnAmountIs | null = null;
  for (const m of text.matchAll(AMOUNT)) {
    if (Number(m[1].replace(/,/g, '')) !== amount) continue;
    const before = text.slice(Math.max(0, (m.index ?? 0) - 40), m.index ?? 0).replace(/\b(?:kes|ksh|kshs|ngn|usd)\b\.?\s*$/i, '');
    const after = text.slice((m.index ?? 0) + m[0].length);
    if (CALLED_A_DISCOUNT_AFTER.test(after) || CALLED_A_DISCOUNT_BEFORE.test(before)) return 'discount';
    if (CALLED_A_PRICE_AFTER.test(after) || CALLED_A_PRICE_BEFORE.test(before)) return 'price each';
    found = 'whole';
  }
  return found;
}

/** What the lines that say an amount call it: a price or a discount only where every line that says it calls it that. */
export function whatTheLinesCallIt(lines: readonly string[], amount: number): WhatAnAmountIs | null {
  const called = lines.map((l) => whatTheLineCallsIt(l, amount)).filter((x): x is WhatAnAmountIs => !!x);
  if (!called.length) return null;
  if (called.includes('whole')) return 'whole';
  return called.includes('discount') ? 'discount' : 'price each';
}

const VALUE_KEY = /^(?:deal\s+)?(?:value|amount|worth|size)$/i;
const PRICE_EACH_KEY = /^(?:price\s+each|unit\s+price|price\s+per\s+unit|price)$/i;
export const PRICE_EACH = 'Price each';
export const DISCOUNT = 'Discount';

const money = (currency: string, n: number) => `${currency ? `${currency} ` : ''}${Number(n).toLocaleString('en-GB')}`;

/* ------------------------------------------------------------------------------- only the numbers that were said */

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, a: 1, an: 1,
};
const SCALE: Record<string, number> = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, hundred: 100 };

/** Every number a text says, in digits ("4,500", "15k") or in words ("five", "twelve thousand"). */
export function theNumbersSaid(text: string): Set<number> {
  const out = new Set<number>();
  const t = String(text ?? '');
  for (const m of t.matchAll(/(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k|thousand|million|m)?\b/gi)) {
    const n = Number(m[1].replace(/,/g, ''));
    if (!Number.isFinite(n)) continue;
    out.add(n);
    if (m[2]) out.add(n * SCALE[m[2].toLowerCase()]);
  }
  for (const m of t.toLowerCase().matchAll(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\b(?:[\s-]+(one|two|three|four|five|six|seven|eight|nine))?(?:\s+(hundred|thousand|million))?/g)) {
    const n = NUMBER_WORDS[m[1]] + (m[2] ? NUMBER_WORDS[m[2]] : 0);
    out.add(n);
    if (m[3]) out.add(n * SCALE[m[3]]);
  }
  return out;
}

const UNITS_KEY = /^(?:units?|quantity|qty|how many)$/i;
const NEED_KEY = /^need$/i;
/* "five units if they're KES 4,500 each", "6 units", "two units": the number of units the customer's need says. */
const UNITS_IN_A_NEED = /\b(\d[\d,]*|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty)\s+(?:units?|pieces?|dispensers?)\b/i;

/**
 * ONLY THE NUMBERS THAT WERE SAID (Drop Access run 1, A2). Juja Hardware read "KES 180,000": the record reader wrote "Units: 40"
 * on it from Joseph's line "I can ask Grace again. I'll do it today.", next to "My goal is the 40 units Grace expects." in the same
 * check-in, and 40 units at KES 4,500 is 180,000. Joseph had said five units at KES 4,500 each. A deal's units and value are kept
 * only where a line about the deal says that number; units the customer's need gives ("five units if they're KES 4,500 each")
 * stand where none is kept. Used by the record reader on the line it reads, and by the board on the owner's lines about the deal.
 */
export function withOnlyTheNumbersSaid(fields: Record<string, string> | null | undefined, lines: readonly string[]): Record<string, string> {
  const out: Record<string, string> = { ...(fields ?? {}) };
  const said = new Set<number>();
  for (const l of lines) for (const n of theNumbersSaid(l)) said.add(n);
  for (const k of Object.keys(out)) {
    const v = String(out[k] ?? '').trim();
    if (!v) continue;
    if (UNITS_KEY.test(k.trim())) {
      const n = theUnitsOf({ Units: v });
      if (n != null && !said.has(n)) delete out[k];
    } else if (VALUE_KEY.test(k.trim())) {
      const m = theMoneyOf({ Value: v });
      if (m && !said.has(m.amount)) delete out[k];
    }
  }
  if (!Object.keys(out).some((k) => UNITS_KEY.test(k.trim()) && String(out[k] ?? '').trim())) {
    const need = Object.entries(out).find(([k]) => NEED_KEY.test(k.trim()))?.[1];
    const m = need ? UNITS_IN_A_NEED.exec(String(need)) : null;
    if (m) out.Units = m[1];
  }
  return out;
}

/**
 * A deal's details with its value as the whole amount: a value the lines call a price for one unit is kept as "Price each" and a
 * discount as "Discount"; units times the price of one unit is the value where both are on record. Nothing else changes.
 * With `onlyNumbersSaid`, a units or value detail no line says is not kept first (withOnlyTheNumbersSaid).
 */
export function withTheValueWorkedOut(fields: Record<string, string> | null | undefined, lines: readonly string[], opts: { onlyNumbersSaid?: boolean } = {}): Record<string, string> {
  const out: Record<string, string> = opts.onlyNumbersSaid ? withOnlyTheNumbersSaid(fields, lines) : { ...(fields ?? {}) };
  const valueKey = Object.keys(out).find((k) => VALUE_KEY.test(k.trim()));
  if (valueKey && String(out[valueKey] ?? '').trim()) {
    const amount = theNumber(out[valueKey]);
    const called = amount != null ? whatTheLinesCallIt(lines, amount) : null;
    if (called === 'price each' || called === 'discount') {
      const said = String(out[valueKey]).trim();
      delete out[valueKey];
      out[called === 'price each' ? PRICE_EACH : DISCOUNT] = said;
    }
  }
  const priceKey = Object.keys(out).find((k) => PRICE_EACH_KEY.test(k.trim()));
  const hasValue = Object.keys(out).some((k) => VALUE_KEY.test(k.trim()) && String(out[k] ?? '').trim());
  if (priceKey && !hasValue) {
    const units = theUnitsOf(out);
    const price = theMoneyOf({ Value: out[priceKey] });
    if (units != null && units > 0 && price) out.Value = money(price.currency, units * price.amount);
  }
  return out;
}

/* ------------------------------------------------------------------------------------------- the buying date */

export const BUYING_DATE = 'Buying date';

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};
const MONTH = '(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)';
const DAY = '(\\d{1,2})(?:st|nd|rd|th)?';
const MONTH_DAY = new RegExp(`\\b${MONTH}\\.?\\s+${DAY}\\b`, 'i');
const DAY_MONTH = new RegExp(`\\b${DAY}\\s+(?:of\\s+)?${MONTH}\\b`, 'i');
const END_OF_THE_MONTH = /\b(?:at\s+)?the\s+end\s+of\s+(?:the|this)\s+month\b/i;
/* The customer buying: "she will buy", "they are going to order", "Rose wants to buy". Never "I will buy" or "we will order". */
const THEY_BUY = /\b(?:she|he|they|it)\s+(?:will|['’]ll|is going to|are going to|plans? to|wants? to|is ready to|are ready to)\s+(?:buy|order|purchase|pay|place\s+(?:the|an|her|his|their)\s+order)\b|\b[A-Z][a-z]+\s+(?:will|is going to|plans? to|wants? to)\s+(?:buy|order|purchase|pay)\b|\b(?:buying|purchase)\s+date\b|\bwill\s+be\s+buying\b/;
const WE_BUY = /^\s*(?:i|we)\s+(?:will|['’]ll|am going to|are going to)\s+(?:buy|order|purchase|pay)\b/i;

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const aRealDay = (y: number, m: number, d: number) => {
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
};

/** The day a line says the customer will buy, as YYYY-MM-DD, or null. The year is the one the line was said in, or the next where the day has passed. */
export function aBuyingDateSaid(line: string, saidOn: Date): string | null {
  const text = String(line ?? '');
  if (!THEY_BUY.test(text) || WE_BUY.test(text)) return null;
  const y = saidOn.getUTCFullYear();
  const md = MONTH_DAY.exec(text);
  const dm = md ? null : DAY_MONTH.exec(text);
  let month: number | null = null;
  let day: number | null = null;
  if (md) { month = MONTHS[md[1].toLowerCase()]; day = Number(md[2]); }
  else if (dm) { month = MONTHS[dm[2].toLowerCase()]; day = Number(dm[1]); }
  if (month && day) {
    let year = y;
    if (!aRealDay(year, month, day)) return null;
    /* A day more than a month before the line was said is next year's. */
    if (Date.UTC(year, month - 1, day) < saidOn.getTime() - 31 * 86_400_000) year += 1;
    return aRealDay(year, month, day) ? iso(year, month, day) : null;
  }
  if (END_OF_THE_MONTH.test(text)) {
    const m = saidOn.getUTCMonth() + 1;
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return iso(y, m, last);
  }
  return null;
}

const squash = (s: string) => (s ?? '').toLowerCase().replace(/[‘’“”'"]/g, '').replace(/\s+/g, ' ').trim();
const aWord = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whether a line is about a deal: it names the customer, or the person they deal with there (a name, never "the assistant"). */
export function aLineIsAbout(line: string, deal: { name: string; fields?: Record<string, string> | null }): boolean {
  const text = String(line ?? '');
  const name = squash(deal.name);
  if (name.length >= 3 && squash(text).includes(name)) return true;
  const contact = (theContactOf(deal.fields ?? null) ?? '').trim();
  if (!/^[A-Z][\p{L}'’-]+(?:\s+[A-Z][\p{L}'’-]+)?$/u.test(contact)) return false;
  return new RegExp(`(?:^|[^\\p{L}])${aWord(contact)}(?=$|[^\\p{L}])`, 'u').test(text);
}

/** A valid buying date on a deal's details, or null. */
export function theBuyingDateOf(fields: Record<string, string> | null | undefined): string | null {
  const v = String(fields?.[BUYING_DATE] ?? '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m && aRealDay(Number(m[1]), Number(m[2]), Number(m[3])) ? v : null;
}

/**
 * The buying date the owner's own lines give a deal, the latest said: each line by the deal's owner that is about the deal and
 * says when the customer will buy. Null where none does.
 */
export function theBuyingDateTheySaid(deal: { name: string; ownerParticipantId?: string | null; fields?: Record<string, string> | null }, lines: readonly { text: string; participantId: string | null; createdAt: Date | string }[]): string | null {
  let latest: { at: number; day: string } | null = null;
  for (const l of lines) {
    if (!deal.ownerParticipantId || l.participantId !== deal.ownerParticipantId) continue;
    if (!aLineIsAbout(l.text, deal)) continue;
    const at = new Date(l.createdAt);
    const day = aBuyingDateSaid(l.text, at);
    if (day && (!latest || at.getTime() >= latest.at)) latest = { at: at.getTime(), day };
  }
  return latest?.day ?? null;
}
