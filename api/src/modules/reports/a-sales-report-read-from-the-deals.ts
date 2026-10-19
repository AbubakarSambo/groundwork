import type { ADealOnRecord } from '../board/a-sales-aim-is-counted-from-the-deals';
import { theStagesOnRecord, type AStageOnRecord } from '../board/a-deals-stages-are-kept';
import { theCriteriaOnRecord, theBudgetCounts, isAPriceRange, readsAsAPayment, aPaymentIsAbout, type ARangeAnswer, type ACriterion } from '../board/a-deals-four-criteria';
import { aLineIsAbout, theBuyingDateOf } from '../board/a-deals-value-and-buying-date';
import { notAnsweringSince, hasStalled, theContactOf } from '../board/a-deal-that-has-stalled';
import { aNumberPeopleCanRead } from '../board/an-aim-is-a-sentence-about-somebody';
import { theMoneyOf } from '../board/a-sales-aim-is-counted-from-the-deals';
import { aPromiseSomebodyElseMade } from '../conversation/a-promise-somebody-else-made';

/**
 * A SALES CHECK-IN'S REPORTS, READ FROM THE DEALS ON RECORD (Hafsah's points 16, 18, 19, 20 and 21, 18 October 2026; behind
 * Release 1's switch; the kit's B4-reports-every-check-in/sales-team-report.txt and B4-reports-and-sharing/own-report.txt).
 *
 * Everything here is read from the record as it stands: the deals, each stage kept with its day, the payment and document
 * rules the board already uses, and what people said. Nothing is written, and nothing is said that the record cannot show.
 *
 *  - IN SHORT, for the team's report: what moved that day and how much of it has proof ("Three sales moved forward today, and
 *    one of them has proof."). A move is a change of stage the record kept with its day (a-deals-stages-are-kept). Proof is the
 *    board's own: a payment record for the last stage, a document for any other.
 *  - WHY THE NUMBERS DON'T MATCH, for the team's report, only where the record can work it out: deals where the customer gave a
 *    price range and the lead has not decided whether a range counts as a budget. Which deals each way counts, and the total
 *    each way. Anything else, and the section is not shown.
 *  - ONE THING TO THINK ABOUT, for a person's own report: a question about one of their own deals that is stuck, never a
 *    repeat of what they said they will do.
 *  - A DATE FROM A DOCUMENT OVER A DATE FROM MEMORY, for a person's own lines (release plan Part 1A): where a document they
 *    added dates the same thing differently, the document's date is shown and what they said is noted.
 *  - A CUSTOMER'S PROMISE, for a person's own lines: said as the customer's, kept on the customer's deal.
 */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const small = (n: number) => (n <= 10 ? NUMBER_WORDS[n].toLowerCase() : aNumberPeopleCanRead(n));
const Small = (n: number) => (n <= 10 ? NUMBER_WORDS[n] : aNumberPeopleCanRead(n));
const listed = (xs: string[], and = 'and') => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} ${and} ${xs[xs.length - 1]}` : xs[0] ?? '');
const same = (a: string | null | undefined, b: string | null | undefined) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

/** "2026-10-15", the day in the given zone. */
export function aDayKey(d: Date, zone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
/** "15 October", from a day key. */
export function aDayInWords(key: string): string {
  const [, m, d] = key.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}
/** "Thursday 15 October", from a day key. */
export function aDayWithItsWeekday(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()]} ${d} ${MONTHS[m - 1]}`;
}

/* ------------------------------------------------------------------------------------------- what moved that day */

export interface AMoveThatDay {
  dealId: string;
  name: string;
  ownerParticipantId: string | null;
  from: string;
  to: string;
  /** Proof for the stage it moved to: a payment record for the last stage, a document for any other. */
  proven: boolean;
}

/** Each deal that moved forward on one of these days, to the furthest stage it reached on them. A deal's first stage on record is not a move. */
export function theMovesOnTheDays(deals: readonly ADealOnRecord[], stages: readonly string[], days: ReadonlySet<string>, zone: string): AMoveThatDay[] {
  const last = stages.length ? stages[stages.length - 1] : 'Won';
  const at = (s: string) => stages.findIndex((x) => same(x, s));
  const out: AMoveThatDay[] = [];
  for (const d of deals) {
    const kept: AStageOnRecord[] = theStagesOnRecord(d);
    let from: string | null = null;
    let to: string | null = null;
    for (let i = 1; i < kept.length; i += 1) {
      if (!days.has(aDayKey(new Date(kept[i].on), zone)) || same(kept[i].stage, kept[i - 1].stage)) continue;
      /* Only forward: a check-in never moves a deal back a stage, and the lead putting one back is not a sale moving forward. */
      if (at(kept[i].stage) <= at(kept[i - 1].stage) && at(kept[i - 1].stage) >= 0) continue;
      if (from === null) from = kept[i - 1].stage;
      to = kept[i].stage;
    }
    if (!from || !to) continue;
    const proven = same(to, last) ? !!d.paid : !!d.proven;
    out.push({ dealId: d.id, name: d.name, ownerParticipantId: d.ownerParticipantId, from, to, proven });
  }
  return out;
}

/*
 * WHAT A MOVE SAYS UNDER "WHAT MOVED" (Drop Access short run, 18 October). Grace's team report read "Mama Mboga Mart / Mercy /
 * Mama Mboga Mart didn't state a budget.": the line beside the deal was the latest sentence naming it, which was about a
 * criterion nobody had given. The kit says what moved: "Now qualified. There is proof of the owner's budget." So a move says
 * the stage it reached, then the owner's own line about it from that check-in, word for word: a line about the deal (it names
 * the deal or its contact, or the record's note says who "her" is), never one saying something was not said or not known
 * (a budget, who decides, the buying date or the need). A line that names the stage it reached is read first, then a line of
 * progress; what they hope for or worry about is not what moved. Where no such line is left, the stage alone is said.
 */
const A_MISSING_CRITERION = /\b(?:didn['’]?t|did not|don['’]?t|do not|hasn['’]?t|has not|haven['’]?t|have not|not yet|no|never|without)\b[^.!?]*\b(?:budget|decision[- ]?maker|who decides|decides|buying date|when (?:they|she|he|it) (?:will |would )?buy|need)\b/i;

export function aLineSaysACriterionIsMissing(text: string): boolean {
  return A_MISSING_CRITERION.test(String(text ?? ''));
}

/** "Now quoted." for a one-word stage, "It is now at Need established." otherwise. */
export function theStageItReached(stage: string): string {
  const s = String(stage ?? '').trim();
  return /^\p{L}+$/u.test(s) ? `Now ${s.toLowerCase()}.` : `It is now at ${s}.`;
}

export function whatAMoveSays(
  move: Pick<AMoveThatDay, 'name' | 'to'>,
  deal: { name: string; fields?: Record<string, string> | null },
  /* The owner's own lines from this session's check-in: `raw` as kept (the record's note included), `text` as people read it. */
  theirLines: readonly { raw: string; text: string; type?: string | null }[],
  /* "Mercy", or "You" where the reader is the owner; null where nobody may be named. */
  who: string | null,
): string {
  const reached = theStageItReached(move.to);
  const about = theirLines.filter((l) => aLineIsAbout(l.raw, deal) && !aLineSaysACriterionIsMissing(l.text) && l.text.trim());
  const stem = String(move.to ?? '').trim().split(/\s+/)[0].toLowerCase().replace(/(?:ed|d|s)$/, '');
  const line = (stem.length >= 3 ? about.find((l) => l.text.toLowerCase().includes(stem)) : undefined)
    ?? about.find((l) => l.type === 'PROGRESS');
  if (!line || !who) return reached;
  const words = line.text.trim().replace(/^["“]|["”]$/g, '');
  return `${reached} ${who} said, "${/[.!?]$/.test(words) ? words : `${words}.`}"`;
}

/** The first day the record holds a move between stages, or null where it holds none. */
export function theFirstMoveOnRecord(deals: readonly ADealOnRecord[], zone: string): string | null {
  let first: string | null = null;
  for (const d of deals) {
    const kept = theStagesOnRecord(d);
    for (let i = 1; i < kept.length; i += 1) {
      if (same(kept[i].stage, kept[i - 1].stage)) continue;
      const k = aDayKey(new Date(kept[i].on), zone);
      if (!first || k < first) first = k;
    }
  }
  return first;
}

/**
 * IN SHORT, as the kit says it: "Three sales moved forward today, and one of them has proof." `when` is "today" for today's
 * report, otherwise "on 15 October".
 */
export function inShortFromTheMoves(moves: readonly AMoveThatDay[], when: string, dayKey: string, firstMoveOnRecord: string | null): string[] {
  const n = moves.length;
  if (n === 0) {
    if (firstMoveOnRecord && firstMoveOnRecord > dayKey) {
      return [`No sale moved forward ${when} that the record can show. The first move between stages it holds is from ${aDayInWords(firstMoveOnRecord)}.`];
    }
    return [`No sale moved forward ${when}.`];
  }
  const k = moves.filter((m) => m.proven).length;
  const proof = n === 1
    ? (k === 1 ? 'and it has proof' : 'but it has no proof yet')
    : k === n ? `and ${n === 2 ? 'both' : 'all'} of them have proof`
      : k === 0 ? (n === 2 ? 'but neither of them has proof yet' : 'but none of them has proof yet')
        : `and ${small(k)} of them ${k === 1 ? 'has' : 'have'} proof`;
  return [`${Small(n)} ${n === 1 ? 'sale' : 'sales'} moved forward ${when}, ${proof}.`];
}

/* ------------------------------------------------------------------------------------- why the numbers don't match */

export interface WhyTheNumbersDontMatch {
  /** The plain sentences, in the kit's order: the two ways, what it affects with the total each way, and that nobody is wrong. */
  says: string[];
  affected: string[];
  countsWithARange: string[];
  countsWithout: string[];
}

/**
 * Only where the record can work it out: deals where the customer gave a price range, with the need, the decision maker and
 * the buying date on record, and the lead has not decided whether a price range counts as a budget. Then which deals count as
 * qualified each way, and the total each way. Otherwise null, and the section is not shown.
 */
export function whyTheNumbersDontMatch(
  deals: readonly (Pick<ADealOnRecord, 'name' | 'fields' | 'stage'> & { buyingDate?: string | null; ownerFirstName?: string | null })[],
  range: ARangeAnswer,
  lastStage = 'Won',
  /** "You" for the lead; the lead's first name for anybody else who reads it. */
  whoDecides = 'You',
): WhyTheNumbersDontMatch | null {
  if (range !== null) return null;
  const open = deals.filter((d) => !same(d.stage, lastStage));
  const criteria = (d: (typeof open)[number]) => theCriteriaOnRecord(d.fields, d.buyingDate ?? theBuyingDateOf(d.fields));
  const otherThree = (c: Record<ACriterion, string | null>) => !!c.need && !!c['decision maker'] && !!c['buying date'];
  const affected = open.filter((d) => { const c = criteria(d); return otherThree(c) && isAPriceRange(c.budget); });
  if (!affected.length) return null;
  const qualifies = (d: (typeof open)[number], r: ARangeAnswer) => { const c = criteria(d); return otherThree(c) && theBudgetCounts(c.budget, r); };
  const withRange = open.filter((d) => qualifies(d, 'yes'));
  const without = open.filter((d) => qualifies(d, 'no'));
  const example = affected[0];
  const exampleBudget = criteria(example).budget;
  const who = [...new Set(affected.map((d) => String(d.ownerFirstName ?? '').trim()).filter(Boolean))];
  const value = (xs: typeof open): string => {
    const m = xs.map((d) => theMoneyOf(d.fields));
    if (!xs.length || m.some((x) => !x)) return '';
    const currency = m[0]!.currency;
    if (m.some((x) => x!.currency !== currency)) return '';
    const total = m.reduce((a, x) => a + x!.amount, 0);
    return `, worth ${currency ? `${currency} ` : ''}${aNumberPeopleCanRead(total)}`;
  };
  const counted = (xs: typeof open) => (xs.length === 0 ? 'no deal is qualified' : `${small(xs.length)} ${xs.length === 1 ? 'deal is' : 'deals are'} qualified${value(xs)}`);
  return {
    says: [
      `${who.length ? `Some of ${listed(who)}’s customers` : 'Some customers'} gave a price range, not a fixed amount. For example, ${example.name} gave ${exampleBudget}. ${whoDecides === 'You' ? 'You have' : `${whoDecides} has`} not decided yet whether a price range counts as the customer’s budget, so the same deals can be counted two ways.`,
      `This affects ${small(affected.length)} ${affected.length === 1 ? 'sale' : 'sales'}: ${listed(affected.map((d) => d.name))}. If a price range counts, ${counted(withRange)}${withRange.length ? `: ${listed(withRange.map((d) => d.name))}` : ''}. If it does not, ${counted(without)}${without.length ? `: ${listed(without.map((d) => d.name))}` : ''}.`,
      'Nobody is doing anything wrong. The team has not agreed on one rule yet.',
    ],
    affected: affected.map((d) => d.name),
    countsWithARange: withRange.map((d) => d.name),
    countsWithout: without.map((d) => d.name),
  };
}

/* ------------------------------------------------------------------------------------------ one thing to think about */

export interface ALineOnRecord { text: string; participantId: string | null; createdAt: Date | string }

/** The deal's stage as of a time: the last stage kept on or before it, or its stage where nothing was kept. Null where it was not on record yet. */
function theStageAsOf(d: ADealOnRecord, at: Date): { stage: string | null; since: Date | null; asOf: boolean } | null {
  if (d.firstOnRecordAt.getTime() > at.getTime()) return null;
  const kept = theStagesOnRecord(d).filter((s) => new Date(s.on).getTime() <= at.getTime());
  if (!kept.length) return { stage: d.stagesKept?.length ? null : d.stage, since: null, asOf: true };
  let i = kept.length - 1;
  while (i > 0 && same(kept[i - 1].stage, kept[i].stage)) i -= 1;
  return { stage: kept[kept.length - 1].stage, since: new Date(kept[i].on), asOf: !!kept[i].asOf };
}

const PLAIN_MISSING: Record<ACriterion, string> = {
  need: 'what they need',
  budget: 'how much they can spend',
  'decision maker': 'who decides',
  'buying date': 'when they will buy',
};

/**
 * ONE QUESTION ABOUT ONE OF THEIR OWN DEALS THAT IS STUCK, as of their check-in (the kit: "Westgate Deli said yes two weeks ago,
 * but they have not paid the deposit. What would help you get the deposit this week?"). In this order, the first that holds:
 *  1. a deal down as won with no payment record: said paid, or not;
 *  2. a deal whose customer has not answered for the stall rule's working days;
 *  3. a deal at the quote stage whose customer has not said yes;
 *  4. an open deal missing what it needs to be qualified, the one at its stage longest.
 * Null where none of their deals is stuck.
 */
export function oneThingToThinkAbout(
  theirDeals: readonly ADealOnRecord[],
  stages: readonly string[],
  lines: readonly ALineOnRecord[],
  at: Date,
  opts: {
    ourSide?: string[]; buyingDateOf?: (d: ADealOnRecord) => string | null; dayInWords?: (d: Date) => string;
    /** Their open deals that wait on a colleague: "the samples" from Joseph, since 12 October (quality pass, 18 October, O-7). */
    waitsOnAColleague?: { dealName: string; colleague: string; thing: string; since: Date }[];
  } = {},
): string | null {
  const last = stages.length ? stages[stages.length - 1] : 'Won';
  const quoted = stages.find((s) => /quot/i.test(s)) ?? 'Quoted';
  const said = lines.filter((l) => new Date(l.createdAt).getTime() <= at.getTime());
  const day = opts.dayInWords ?? ((d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`);
  const now = theirDeals
    .map((d) => ({ d, s: theStageAsOf(d, at) }))
    .filter((x): x is { d: ADealOnRecord; s: { stage: string | null; since: Date | null; asOf: boolean } } => !!x.s)
    .sort((a, b) => (a.s.since?.getTime() ?? a.d.firstOnRecordAt.getTime()) - (b.s.since?.getTime() ?? b.d.firstOnRecordAt.getTime()));

  /* 1. Down as won, and no payment record by then. A signed order whose customer pays on a day still to come is proof of the sale, and nothing to chase yet (O-7). */
  for (const { d, s } of now) {
    if (!same(s.stage, last)) continue;
    if (d.paid && d.paidOn && d.paidOn.getTime() <= at.getTime()) continue;
    const paysOn = /\bon\s+\w+day\s+(\d{1,2})\s+(\w+)/i.exec(String((d as any).paysWhen ?? ''));
    if (d.signed && paysOn) {
      const m = MONTHS.findIndex((x) => x.toLowerCase() === paysOn[2].toLowerCase());
      if (m >= 0 && Date.UTC(at.getUTCFullYear(), m, Number(paysOn[1]), 23, 59) >= at.getTime()) continue;
    }
    const saidPaid = said.some((l) => readsAsAPayment(l.text) && aPaymentIsAbout(l.text, { name: d.name, fields: d.fields }));
    if (saidPaid) return `You said ${d.name} paid, but nothing written shows the payment yet. What would help you get the receipt or the payment message this week?`;
    const when = s.since && !s.asOf ? ` on ${day(s.since)}` : '';
    return `${d.name} said yes${when}, but nothing on record says they have paid yet. What would help you get the payment this week?`;
  }
  /* 1b. Their deal waits only on a colleague: what could they do before it comes (O-7). */
  for (const w of opts.waitsOnAColleague ?? []) {
    const d = now.find((x) => same(x.d.name, w.dealName) && !same(x.s.stage, last));
    if (!d) continue;
    const contact = theContactOf(d.d.fields);
    const plural = /s$/i.test(w.thing.trim());
    return `${d.d.name} has waited on ${w.colleague}’s ${w.thing} since ${day(w.since)}. What could you show ${contact ?? 'them'} before the ${w.thing} ${plural ? 'come' : 'comes'}?`;
  }
  /* 2. The customer has not answered for the stall rule's working days. */
  for (const { d, s } of now) {
    if (same(s.stage, last)) continue;
    const since = notAnsweringSince(d.name, said, { people: opts.ourSide ?? [], contact: theContactOf(d.fields), peopleThere: d.peopleThere ?? [] });
    if (since && hasStalled(since, at)) return `${d.name} has not answered since ${day(since)}. What would help you hear from them this week?`;
  }
  /* 3. Quoted, and no yes yet. */
  for (const { d, s } of now) {
    if (!same(s.stage, quoted)) continue;
    /* A yes to the quote is on record (Savannah Cafe on 14 October): it is not waiting for one. */
    const yes = String(d.fields?.['Quote accepted'] ?? '').slice(0, 10);
    if (yes && yes <= at.toISOString().slice(0, 10)) continue;
    const since = s.since && !s.asOf ? ` since ${day(s.since)}` : '';
    return `${d.name} has had your quote${since}, but they have not said yes yet. What would help you get an answer this week?`;
  }
  /* 4. Open, and missing what it needs to be qualified. */
  const qualifiedAt = stages.findIndex((x) => /qualif/i.test(x));
  for (const { d, s } of now) {
    const at_ = stages.findIndex((x) => same(x, s.stage));
    if (qualifiedAt >= 0 && at_ >= qualifiedAt) continue;
    const c = theCriteriaOnRecord(d.fields, opts.buyingDateOf ? opts.buyingDateOf(d) : theBuyingDateOf(d.fields), { readTheDetails: true });
    const missing = (['budget', 'decision maker', 'buying date', 'need'] as ACriterion[]).filter((k) => !c[k]);
    if (!missing.length) continue;
    const need = c.need ? `${d.name} wants ${c.need.replace(/[.]+$/, '')}, but` : `For ${d.name},`;
    return `${need} you do not know yet ${listed(missing.map((k) => PLAIN_MISSING[k]), 'or')}. What would help you find out this week?`;
  }
  return null;
}

/* --------------------------------------------------------------------------------- a date from a document over memory */

/** A thing that happened on a day, as a line and a document both say it. */
const EVENTS: { verb: string; inLine: RegExp; inDoc: RegExp }[] = [
  { verb: 'signed', inLine: /\bsigned\b/i, inDoc: /\bsigned\b[^\n]{0,80}?(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i },
  { verb: 'paid', inLine: /\b(?:paid|payment)\b/i, inDoc: /\b(?:received|paid)\b[^\n]{0,80}?\bon\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i },
  { verb: 'delivered', inLine: /\bdeliver(?:ed|y)\b/i, inDoc: /\bdelivered\b[^\n]{0,60}?(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i },
];
const MONTH_RE = MONTHS.join('|');
const ORDINAL = String.raw`(\d{1,2})(?:st|nd|rd|th)?`;
/** "the 15th of October", "15 October", "October 15th", or "today", "yesterday", with what follows it ("today, which is the 15th of October"). */
const A_DAY_SAID = new RegExp(String.raw`\b(?:today|yesterday)(?:,?\s+which\s+(?:is|was)\s+(?:the\s+)?${ORDINAL}\s+(?:of\s+)?(?:${MONTH_RE}))?|\b(?:on\s+)?(?:the\s+)?${ORDINAL}\s+(?:of\s+)?(?:${MONTH_RE})\b|\b(?:on\s+)?(?:${MONTH_RE})\s+${ORDINAL}\b`, 'i');

function theDayALineSays(text: string, saidOn: Date, zone: string): string | null {
  const m = A_DAY_SAID.exec(text);
  if (!m) return null;
  const phrase = m[0];
  const explicit = new RegExp(String.raw`${ORDINAL}\s+(?:of\s+)?(${MONTH_RE})|(${MONTH_RE})\s+${ORDINAL}`, 'i').exec(phrase);
  const year = Number(aDayKey(saidOn, zone).slice(0, 4));
  if (explicit) {
    const dayN = Number(explicit[1] ?? explicit[4]);
    const month = MONTHS.findIndex((x) => x.toLowerCase() === String(explicit[2] ?? explicit[3]).toLowerCase()) + 1;
    return `${year}-${String(month).padStart(2, '0')}-${String(dayN).padStart(2, '0')}`;
  }
  if (/^today/i.test(phrase)) return aDayKey(saidOn, zone);
  if (/^yesterday/i.test(phrase)) return aDayKey(new Date(saidOn.getTime() - 86_400_000), zone);
  return null;
}

/** Names in a line that a document can be matched on: a capitalised word of three letters or more that is not the first word's title. */
function theNamesIn(text: string): string[] {
  return [...String(text).matchAll(/\b(\p{Lu}[\p{L}'’-]{2,})\b/gu)].map((m) => m[1]).filter((w) => !/^(?:Mrs|Mr|Ms|Dr|The|Today|Yesterday|I|We|He|She|They|It|October|September|November|December|January|February|March|April|May|June|July|August)$/i.test(w));
}

export interface ADocumentForTheirLines { fileName: string; content: string | null; participantId: string | null; origin?: string | null }

/**
 * Where a document the person added dates the same thing as their line differently: the line read with the document's date,
 * and what they said noted. Null where no document they added dates it, or the dates agree.
 */
export function theDocumentsDateOverWhatWasSaid(
  line: { text: string; createdAt: Date | string },
  docs: readonly ADocumentForTheirLines[],
  zone: string,
): { readAs: string | null; how: string; documentsDay: string; saidDay: string } | null {
  const text = String(line.text ?? '');
  const ev = EVENTS.find((e) => e.inLine.test(text));
  if (!ev) return null;
  const saidDay = theDayALineSays(text, new Date(line.createdAt), zone);
  if (!saidDay) return null;
  const names = theNamesIn(text).map((n) => n.toLowerCase());
  if (!names.length) return null;
  for (const doc of docs) {
    const body = `${doc.content ?? ''}`;
    if (!names.some((n) => body.toLowerCase().includes(n))) continue;
    const m = ev.inDoc.exec(body);
    if (!m) continue;
    const y = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);
    const documentsDay = `${y}-${String(Number(m[2])).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`;
    if (documentsDay === saidDay) return null;
    const replaced = text.replace(A_DAY_SAID, `on ${aDayInWords(documentsDay)}`).replace(/\bon on\b/i, 'on');
    const what = /\.(?:jpe?g|png|heic|webp)$/i.test(doc.fileName) || doc.origin === 'photo' ? 'the photo you added' : 'the document you added';
    return {
      readAs: replaced !== text ? replaced : null,
      how: `This date comes from ${what}. You said it was ${ev.verb} on ${aDayInWords(saidDay)}.`,
      documentsDay,
      saidDay,
    };
  }
  return null;
}

/* ---------------------------------------------------------------------------------------------- a customer's promise */

const squashed = (s: string) => String(s ?? '').toLowerCase().replace(/[‘’“”'"]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/**
 * Who made the promise, only where the line begins with a person or business on record: a customer ("Savannah Cafe will pay"),
 * the person a deal is with ("Rose said she will buy", "Mrs. Njeri will sign"), or somebody in this check-in. Never the line's
 * first word as such: "Delivery is set for Friday, and they'll pay then." begins with "Delivery", which is nobody (Drop Access
 * short run, Mercy's own report, 18 October).
 */
function whosePromise(text: string, deals: readonly { name: string; fields?: Record<string, string> | null }[], people: readonly string[]): string | null {
  const t = String(text).trim().replace(/^(?:And|But|Also|So|Now)\s+/, '');
  const begins = (name: string) => name.length >= 2 && new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'iu').test(t);
  const deal = deals.find((d) => begins(d.name));
  if (deal) return deal.name;
  const contact = deals.map((d) => (theContactOf(d.fields ?? null) ?? '').trim()).find((c) => /^\p{Lu}/u.test(c) && begins(c));
  if (contact) return contact;
  return people.map((p) => p.trim()).find((p) => /^\p{Lu}/u.test(p) && begins(p)) ?? null;
}

/** The deal a line is kept on: it names the customer or their person, or the deal holds the line itself (its next step). */
function theDealALineIsKeptOn<D extends { name: string; fields?: Record<string, string> | null }>(text: string, deals: readonly D[]): D | undefined {
  const line = squashed(text);
  return deals.find((d) => aLineIsAbout(text, d))
    ?? (line.length >= 12 ? deals.find((d) => Object.entries(d.fields ?? {}).some(([k, v]) => !k.startsWith('_') && typeof v === 'string' && squashed(v) === line)) : undefined);
}

/**
 * A customer's promise in a person's own lines, said as the customer's and where it is kept: "This is Rose’s promise, not
 * yours, so it is kept on the Mama Mboga Mart deal, with 30 October as the day they will buy. A message from Rose would prove
 * it." Whose it is comes from the record: the person or business the line begins with, else the customer of the deal it is
 * kept on, else "the customer". Null where the line is the person's own promise.
 */
export function aCustomersPromiseOnTheirDeal(
  text: string,
  deals: readonly { name: string; fields?: Record<string, string> | null; buyingDate?: string | null }[],
  people: readonly string[] = [],
): string | null {
  if (!aPromiseSomebodyElseMade(text)) return null;
  const deal = theDealALineIsKeptOn(text, deals);
  const who = whosePromise(text, deals, people) ?? deal?.name ?? null;
  const whose = who ? `${who}’s` : 'the customer’s';
  if (!deal) return `This is ${whose} promise, not yours, so it is not on your list of things to do.`;
  const buying = deal.buyingDate ?? theBuyingDateOf(deal.fields ?? null);
  return `This is ${whose} promise, not yours, so it is kept on the ${deal.name} deal${buying ? `, with ${aDayInWords(buying)} as the day they will buy` : ''}. A message from ${who ?? 'them'} would prove it.`;
}
