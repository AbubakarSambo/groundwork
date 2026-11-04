import { BUYING_DATE, aLineIsAbout } from './a-deals-value-and-buying-date';
import { theContactOf } from './a-deal-that-has-stalled';
import { aLineNamesTheCustomer } from './one-deal-per-customer';

/**
 * A DEAL'S FOUR CRITERIA, AND THE STAGE ITS RECORD MEETS (Hafsah's answer to Needs Hafsah 7, 17 October 2026;
 * docs/switchboard.md, "Stage rules and the four criteria"; the kit's board-as-lead.txt: "✓ Need / ✓ Budget the customer
 * stated / ✓ Decision maker / ✓ Buying date" and "Reported vs criteria met, stage by stage").
 *
 * THE FOUR, KEPT ON THE DEAL'S OWN DETAILS, each only from what somebody said in a check-in:
 *  - Need: the customer's need, in the customer's words.
 *  - Budget stated: the amount the customer gave, or a range kept as the range it was said as.
 *  - Decision maker: who decides, by name or by role.
 *  - Buying date: the day the customer said they will buy (filed already, a-deals-value-and-buying-date).
 * Which check-in said each one is kept beside them, under a key that is never served (`_criteriaSaid`, as `_stages` is).
 *
 * THE STAGE RULES (criteria met, never only said):
 *  - Contacted: a named customer, and a contact on a date.
 *  - Need established: the customer's need, in their words.
 *  - Pitched: the offer presented to the decision maker or the buyer.
 *  - Qualified: the need, a budget the customer stated, the decision maker and a buying date. All four.
 *  - Quoted: a quote the customer received, with a photo or the sent email.
 *  - Won: a signed order or a payment (a deposit counts), each with its document (Hafsah, 18 October, answer 2: "Drop Access counts
 *    a sale as Won with a signed order or a payment, both as proof. Count proof of payment separately"). Without either, Won is
 *    said, not met. "With proof of payment" counts the payment records alone.
 *
 * A PRICE RANGE AS A BUDGET is Grace's decision for Drop Access, not Groundwork's: until the lead answers "Decide whether a
 * price range counts as a budget", a range is on record and counts as close, but not as met.
 */
export const NEED = 'Need';
export const BUDGET_STATED = 'Budget stated';
export const DECISION_MAKER = 'Decision maker';
export { BUYING_DATE };
/** Which check-in said each criterion: { [label]: { checkInId, sessionNumber, on } }. Never served (`plainFields` serves text only). */
export const CRITERIA_SAID = '_criteriaSaid';

export type ACriterion = 'need' | 'budget' | 'decision maker' | 'buying date';
export const THE_FOUR: ACriterion[] = ['need', 'budget', 'decision maker', 'buying date'];

/** As the kit ticks them. */
export const TICKED_AS: Record<ACriterion, string> = {
  need: 'Need',
  budget: 'Budget the customer stated',
  'decision maker': 'Decision maker',
  'buying date': 'Buying date',
};
/** As the check-in is told what is missing. */
export const ASKED_AS: Record<ACriterion, string> = {
  need: 'the customer\'s need, in the customer\'s words',
  budget: 'the budget the customer stated',
  'decision maker': 'who decides',
  'buying date': 'the day the customer will buy',
};
/** In a sentence a person reads ("The budget the customer stated and the decision maker are not on record yet."). */
const SAID_AS: Record<ACriterion, string> = {
  need: 'the customer\'s need',
  budget: 'the budget the customer stated',
  'decision maker': 'the decision maker',
  'buying date': 'the buying date',
};
export const NOT_ON_RECORD_YET = 'Not on record yet.';

const LABEL_OF: Record<ACriterion, RegExp> = {
  need: /^(?:need|customer'?s? need|the need)$/i,
  budget: /^(?:budget(?: stated)?|budget the customer stated|stated budget)$/i,
  'decision maker': /^(?:decision[- ]?maker|who decides)$/i,
  'buying date': /^buying date$/i,
};
export const FIELD_OF: Record<ACriterion, string> = { need: NEED, budget: BUDGET_STATED, 'decision maker': DECISION_MAKER, 'buying date': BUYING_DATE };

/** The four as the deal's details hold them. The buying date may be given apart, as the board serves it. */
export function theCriteriaOnRecord(
  fields: Record<string, unknown> | null | undefined,
  buyingDate?: string | null,
  /*
   * READ FROM THE DEAL'S OWN DETAILS TOO (Hafsah's quality pass, 18 October, B-14): the record writer keeps "Units", "Price each" and
   * "Contact" more often than "Need" or "Budget stated", so Mama Pima Stores read "Need established" beside "None of the four
   * criteria". With this, the units wanted are the need ("10 units"), a price for one unit the customer's own need names is the
   * budget they stated ("five units if they're KES 4,500 each"), and a deal won with a payment record or a signed order has its
   * value as the budget the customer stated (they paid it, or signed for it). Never a guess: each is a detail on record.
   */
  opts: { readTheDetails?: boolean; wonWithProof?: boolean } = {},
): Record<ACriterion, string | null> {
  const out: Record<ACriterion, string | null> = { need: null, budget: null, 'decision maker': null, 'buying date': null };
  for (const [k, v] of Object.entries(fields ?? {})) {
    if (typeof v !== 'string' || !v.trim()) continue;
    for (const c of THE_FOUR) if (!out[c] && LABEL_OF[c].test(k.trim())) out[c] = v.trim();
  }
  if (opts.readTheDetails) {
    const f = (fields ?? {}) as Record<string, unknown>;
    const said = (k: string) => (typeof f[k] === 'string' ? String(f[k]).trim() : '');
    const units = said('Units');
    if (!out.need && units) out.need = /\bunits?\b/i.test(units) ? units : `${units} ${/^(?:1|one)$/i.test(units) ? 'unit' : 'units'}`;
    const each = said('Price each');
    const amount = each.replace(/[^\d]/g, '');
    if (!out.budget && each && amount && out.need && out.need.replace(/,/g, '').includes(amount)) out.budget = `${each} a unit`;
    const value = said('Value');
    if (!out.budget && opts.wonWithProof && value) out.budget = value;
  }
  if (buyingDate !== undefined) out['buying date'] = buyingDate && /^\d{4}-\d{2}-\d{2}$/.test(buyingDate) ? buyingDate : out['buying date'];
  if (out['buying date'] && !/^\d{4}-\d{2}-\d{2}$/.test(out['buying date'])) out['buying date'] = null;
  return out;
}

/** A budget said as a range: "KES 10,000 to 15,000", "between 10k and 15k", "10,000-15,000". */
export function isAPriceRange(budget: string | null | undefined): boolean {
  const t = String(budget ?? '').toLowerCase();
  return /\d[\d,.]*\s*(?:k|thousand)?\s*(?:-|–|—|to|and)\s*(?:kes|ksh|kshs)?\s*\d/.test(t);
}

/** Grace's answer, as kept in how we work: 'yes' a range counts, 'no' it does not, null not decided. */
export type ARangeAnswer = 'yes' | 'no' | null;
export const THE_RANGE_QUESTION = 'Decide whether a price range counts as a budget';

/** Whether the budget on record counts towards Qualified: an amount does; a range only once the lead has said yes. */
export function theBudgetCounts(budget: string | null, range: ARangeAnswer): boolean {
  if (!budget) return false;
  return !isAPriceRange(budget) || range === 'yes';
}

/** Which of the four are missing, in the kit's order. A range counts as on record (it is not asked for again). */
export function whatIsMissing(c: Record<ACriterion, string | null>): ACriterion[] {
  return THE_FOUR.filter((k) => !c[k]);
}

/** One said line per criterion that changed: which check-in said it. Kept on the deal's details, never served. */
export function withTheCriteriaSaid(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown>,
  said: { checkInId: string | null; sessionNumber: number | null; on: Date },
): Record<string, unknown> {
  const was = theCriteriaOnRecord(before as any);
  const now = theCriteriaOnRecord(after as any);
  const keptOf = (f: any) => (f?.[CRITERIA_SAID] && typeof f[CRITERIA_SAID] === 'object' && !Array.isArray(f[CRITERIA_SAID]) ? f[CRITERIA_SAID] : {});
  const kept: Record<string, unknown> = { ...keptOf(before), ...keptOf(after) };
  for (const c of THE_FOUR) {
    if (!now[c] || now[c] === was[c]) continue;
    kept[FIELD_OF[c]] = { checkInId: said.checkInId, sessionNumber: said.sessionNumber, on: said.on.toISOString() };
  }
  return Object.keys(kept).length ? { ...after, [CRITERIA_SAID]: kept } : after;
}

/* ------------------------------------------------------------------------------------- asked once, from the turns */

/*
 * WHAT A QUESTION ASKED, READ FROM THE CHECK-IN'S OWN TURNS. A Groundwork turn that names the deal (or the person there) and
 * asks one of these is that criterion asked. Read only from the person's own check-ins.
 */
const ASKS: Record<ACriterion, RegExp> = {
  need: /\bwhat\b[^?.]{0,50}\b(?:need|needs|want|wants|looking for|use (?:it|them) for|after)\b|\b(?:their|her|his|the customer['’]?s?)\s+need\b/i,
  budget: /\b(?:budget|spend|afford|set aside|how much (?:money|they|she|he|can|could|do|does|is|are|have)|money (?:ready|for it|available|set))\b/i,
  'decision maker': /\bdecision[- ]?maker\b|\bwho\b[^?.]{0,50}\b(?:decides?|decision|signs?(?:\s+off)?|approves?|final say|makes? the call)\b|\bfinal say\b/i,
  'buying date': /\bbuying date\b|\bwhen\b[^?.]{0,60}\b(?:buy|order|purchase|pay|sign|place)\b|\bby when\b|\bwhat date\b/i,
};

/** Each criterion a Groundwork turn asked about this deal, with the first day it was asked. */
export function theCriteriaAsked(
  turns: readonly { content: string; createdAt: Date | string }[],
  deal: { name: string; fields?: Record<string, string> | null },
): Map<ACriterion, Date> {
  const out = new Map<ACriterion, Date>();
  for (const t of turns) {
    const text = String(t.content ?? '');
    if (!text.includes('?') || !aLineIsAbout(text, deal)) continue;
    /* Only the sentences that ask, so "Kevin said the owner decides." is not a question. */
    const asks = (text.match(/[^.!?\n]*\?/g) ?? []).join(' ');
    for (const c of THE_FOUR) {
      if (!ASKS[c].test(asks)) continue;
      const at = new Date(t.createdAt);
      if (!out.has(c) || at < out.get(c)!) out.set(c, at);
    }
  }
  return out;
}

/* ------------------------------------------------------------------------------------------- the stage met */

/** The kit's six stages, in order. */
export const THE_KITS_STAGES = ['Contacted', 'Need established', 'Pitched', 'Qualified', 'Quoted', 'Won'] as const;
const stageIndex = (s: string | null | undefined) => THE_KITS_STAGES.findIndex((k) => k.toLowerCase() === String(s ?? '').trim().toLowerCase());

/** A payment or a deposit, as a document or a line says it: an M-Pesa message, a receipt, money received. Not a purchase order. */
/* And a bank's own record of money moved: "EQUITY BANK - REMITTANCE ADVICE", "KCB BANK - FUNDS TRANSFER CONFIRMATION" (Drop Access run 1). */
const A_PAYMENT = /\bm-?pesa\b|\breceipt\b|\breceived from\b|\bpayment (?:received|confirmed|record)\b|(?<!\b(?:be|get|gets|getting) )\bpaid\b|\bdeposit (?:received|came in)\b|\bconfirmed\.?\s*(?:kes|ksh)|\bremittance (?:advice|slip)\b|\bfunds? transfer\b|\bbank transfer\b/i;
export function readsAsAPayment(text: string | null | undefined): boolean {
  return A_PAYMENT.test(String(text ?? ''));
}

/** A signed order, as a document or a line says it: a purchase order, an order signed by the customer, an LPO. Not a quote. */
const A_SIGNED_ORDER = /\bpurchase order\b|\bsigned (?:the |an |our )?(?:purchase )?order\b|\border (?:was |is |has been )?signed\b|\bsigned order\b|\bL\.?P\.?O\b|\bPO[-\s]?\d{2,}\b/i;
export function readsAsASignedOrder(text: string | null | undefined): boolean {
  return A_SIGNED_ORDER.test(String(text ?? ''));
}

/**
 * WHETHER A PAYMENT LINE IS ABOUT THIS DEAL: it names the customer (in full, or as the record's own short name: "the M-Pesa
 * message from Kilele"), or the person they deal with there. One rule for the deal's Won criterion and for every "with proof
 * of payment" count (Hafsah's point 12).
 */
export function aPaymentIsAbout(line: string, deal: { name: string; fields?: Record<string, string> | null }): boolean {
  return aLineIsAbout(line, deal) || aLineNamesTheCustomer(line, deal.name);
}

export interface WhatADealShows {
  stage: string | null;
  fields: Record<string, string> | null | undefined;
  buyingDate: string | null;
  /** A named customer, and a contact on a date. */
  contactOnRecord: boolean;
  /** A document backs a line about it (a photo, the sent email). */
  shown: boolean;
  /** A payment or deposit record backs it. */
  paymentRecord: boolean;
  /** A signed order backs it: with a payment record, the other proof that meets Won (answer 2). */
  signedOrder?: boolean;
}

const A_NAMED_PERSON = /^[A-Z][\p{L}'’.-]+(?:\s+[A-Z][\p{L}'’.-]+){0,2}$/u;

/** Each of the kit's stages whose rules the record meets, by its own rule. */
export function theStagesMet(d: WhatADealShows, range: ARangeAnswer): Set<string> {
  const c = theCriteriaOnRecord(d.fields, d.buyingDate, { readTheDetails: true, wonWithProof: !!d.paymentRecord || !!d.signedOrder });
  const reported = stageIndex(d.stage);
  const f = d.fields ?? {};
  const offer = Object.entries(f).some(([k, v]) => /^(?:value|amount|worth|price each|unit price|price|quote)$/i.test(k.trim()) && String(v ?? '').trim());
  const contact = theContactOf(f as any);
  /* The offer went to the decision maker, or to a named person at the customer (never "the assistant"). */
  const toTheBuyer = !!c['decision maker'] || (!!contact && A_NAMED_PERSON.test(contact.replace(/^(?:mr|mrs|ms|dr)\.?\s+/i, 'X ')));
  const met = new Set<string>();
  if (d.contactOnRecord) met.add('Contacted');
  if (c.need) met.add('Need established');
  if (offer && toTheBuyer && reported >= stageIndex('Pitched')) met.add('Pitched');
  if (c.need && theBudgetCounts(c.budget, range) && c['decision maker'] && c['buying date']) met.add('Qualified');
  if (reported >= stageIndex('Quoted') && d.shown) met.add('Quoted');
  if (reported >= stageIndex('Won') && (d.paymentRecord || d.signedOrder)) met.add('Won');
  return met;
}

/** The highest of the kit's stages whose rules are met, or null. */
export function theHighestStageMet(met: Set<string>): string | null {
  for (let i = THE_KITS_STAGES.length - 1; i >= 0; i--) if (met.has(THE_KITS_STAGES[i])) return THE_KITS_STAGES[i];
  return null;
}

/** Whether the four are on record or close: a range not decided yet is close; a range the lead said does not count is not. */
export function everyCriterionMetOrClose(c: Record<ACriterion, string | null>, range: ARangeAnswer, fields?: Record<string, unknown> | null): boolean {
  if (!c.need || !c['decision maker'] || !c['buying date']) return false;
  /*
   * A QUOTE THE CUSTOMER ACCEPTED IS CLOSE TO A STATED BUDGET (standing decision of Hafsah's quality pass, 18 October, B-4, under her
   * Likely rule "every criterion proven or close"): Jane said yes to Kevin's KES 30,000 quote for Savannah Cafe and will pay a deposit
   * on Friday. The budget itself stays unticked, and what is missing is said.
   */
  if (!c.budget) return aQuoteWasAccepted(fields);

  return theBudgetCounts(c.budget, range) || (isAPriceRange(c.budget) && range === null);
}

/** The customer said yes to a quote on record ("Quote accepted", kept by what-the-owner-said-of-each-deal). */
export function aQuoteWasAccepted(fields: Record<string, unknown> | null | undefined): boolean {
  const f = (fields ?? {}) as Record<string, unknown>;
  return typeof f['Quoted'] === 'string' && !!String(f['Quoted']).trim() && typeof f['Quote accepted'] === 'string' && !!String(f['Quote accepted']).trim();
}

/* ------------------------------------------------------------------------------------------- as a reader reads it */

/** `value`: what is on record for a criterion that is met ("Peter", "10 units"), said beside its tick (B-14, R-3). */
export interface ATick { criterion: ACriterion; label: string; met: boolean; says: string | null; value?: string | null }

/**
 * The four, ticked as the kit ticks them, for the opened deal. `whoDecides` is "You" for the lead and the lead's first name for
 * anybody else, for a range not decided yet.
 */
export function theFourTicks(c: Record<ACriterion, string | null>, range: ARangeAnswer, whoDecides: string): ATick[] {
  return THE_FOUR.map((k) => {
    const label = TICKED_AS[k];
    if (!c[k]) return { criterion: k, label, met: false, says: NOT_ON_RECORD_YET };
    if (k === 'budget' && isAPriceRange(c.budget)) {
      if (range === 'yes') return { criterion: k, label, met: true, says: null };
      if (range === 'no') return { criterion: k, label, met: false, says: `The customer gave a price range, ${c.budget}, and a price range does not count as a budget here.` };
      return {
        criterion: k, label, met: false,
        says: whoDecides === 'You'
          ? `The customer gave a price range, ${c.budget}. You have not decided yet whether a price range counts as a budget.`
          : `The customer gave a price range, ${c.budget}. ${whoDecides} has not decided yet whether a price range counts as a budget.`,
      };
    }
    return { criterion: k, label, met: true, says: null, value: k === 'buying date' ? null : c[k] };
  });
}

const listed = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] ?? '');
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const NUMBER_WORDS = ['None', 'One', 'Two', 'Three', 'Four'];

/** "All four criteria are on record." or "Two of the four criteria are on record. The budget the customer stated and the decision maker are not on record yet." */
export function theCriteriaInASentence(ticks: ATick[]): string {
  const met = ticks.filter((t) => t.met).length;
  if (met === 4) return 'All four criteria are on record.';
  if (met === 0) return 'None of the four criteria is on record yet.';
  const missing = ticks.filter((t) => !t.met).map((t) => SAID_AS[t.criterion]);
  return `${NUMBER_WORDS[met]} of the four criteria ${met === 1 ? 'is' : 'are'} on record. ${cap(listed(missing))} ${missing.length === 1 ? 'is' : 'are'} not on record yet.`;
}

/* ------------------------------------------------------------------------------- the lead's answer on a price range */

/**
 * GRACE'S ANSWER, KEPT IN HOW WE WORK (as an answered decision is kept: answerADecision, answerAWaitOnTheLead). The line reads
 * "On whether a price range counts as a budget, the answer is yes." The latest such line is the answer; none, not decided.
 */
const THE_RANGE_ANSWER = /^on whether a price range counts as a budget, the answer is (yes|no)\.?$/i;
export function theRangeAnswerIn(lines: readonly { text?: string | null }[]): ARangeAnswer {
  let found: ARangeAnswer = null;
  for (const l of lines) {
    const m = THE_RANGE_ANSWER.exec(String(l?.text ?? '').trim());
    if (m) found = m[1].toLowerCase() === 'yes' ? 'yes' : 'no';
  }
  return found;
}
/*
 * GRACE'S ANSWER IN HER OWN CHECK-IN (Drop Access run 1, A6). On day 10 Grace said "I decided that Tuskys Westgate's budget range
 * counts, so Mercy's quote is fine." and her board still asked her "Decide whether a price range counts as a budget", with
 * "Grace has not decided yet" on Mercy's deal. Her answer in her check-in is kept the same way as her Yes or No on the board: one
 * line in how we work, once. "I need to decide if Tuskys Westgate's budget range counts" is the question, not an answer.
 */
const A_RANGE = /\b(?:price|budget)\s+ranges?\b|\ba range\b/i;
const STILL_ASKING = /\b(?:decide|deciding|whether|if|need to|needs? clarity|not sure|unsure|ask|asking)\b|\?/i;
const IT_COUNTS = /\b(?:counts?|does count|is fine|is okay|is ok|is acceptable|works|is good enough|is a budget)\b/i;
const IT_DOES_NOT = /\b(?:does not|doesn['’]t|do not|don['’]t|will not|won['’]t|cannot|can['’]t|is not|isn['’]t)\s+(?:count|work|enough|a budget)\b|\bnot a budget\b/i;

/** The lead's answer in one line of her own: 'yes' a range counts, 'no' it does not, or null where the line does not answer it. */
export function theRangeAnswerSaid(text: string | null | undefined): ARangeAnswer {
  const t = String(text ?? '').trim();
  const m = A_RANGE.exec(t);
  if (!m) return null;
  /* Only what is said about the range: from where the range is named to the end of that sentence. */
  const sentence = t.slice(m.index).split(/[.!?;]/)[0];
  if (STILL_ASKING.test(t.slice(0, m.index + sentence.length))) return null;
  if (IT_DOES_NOT.test(sentence)) return 'no';
  if (IT_COUNTS.test(sentence)) return 'yes';
  return null;
}

/** The latest answer among the lead's own lines, in the order they were said, or null. */
export function theLeadsRangeAnswerIn(lines: readonly { text?: string | null; createdAt?: Date | string | null }[]): ARangeAnswer {
  let found: ARangeAnswer = null;
  const sorted = [...lines].sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());
  for (const l of sorted) {
    const a = theRangeAnswerSaid(l.text);
    if (a) found = a;
  }
  return found;
}

export async function thePriceRangeAnswer(prisma: any, groundId: string): Promise<ARangeAnswer> {
  try {
    const lines = await prisma?.groundContextItem?.findMany?.({ where: { groundId, kind: 'WAY_OF_WORKING', closedAt: null }, select: { text: true }, orderBy: { createdAt: 'asc' } });
    return theRangeAnswerIn((lines ?? []) as any[]);
  } catch {
    return null;
  }
}

/**
 * "DECIDE WHETHER A PRICE RANGE COUNTS AS A BUDGET" (board-as-lead.txt: "Brian and Miriam both raised it. It decides whether 4
 * deals count as qualified.", with "Yes, it counts" and "No"). Only where a deal on record has a budget said as a range and the
 * lead has not answered; to the lead alone. Built from the deals the lead is served.
 */
export function thePriceRangeDecision(
  rows: readonly { kind?: string; name: string; owner?: string | null; fields?: Record<string, string> | null; buyingDate?: string | null }[],
  range: ARangeAnswer,
  groundId: string,
): { id: string; says: string; decision: { question: string; why: string; afterwards: string }; action: { label: string; says: string; goesTo: null; choices: { label: string; route: { method: 'POST'; path: string; body: { yes: boolean } } }[] } } | null {
  if (range !== null) return null;
  const withARange = rows.filter((r) => r.kind === 'deal' && isAPriceRange(theCriteriaOnRecord(r.fields, r.buyingDate ?? null).budget));
  if (!withARange.length) return null;
  const who = [...new Set(withARange.map((r) => String(r.owner ?? '').trim().split(/\s+/)[0]).filter((n) => n && !/^(?:a|you)$/i.test(n)))];
  const raised = who.length > 1
    ? `${who.slice(0, -1).join(', ')} and ${who[who.length - 1]} ${who.length === 2 ? 'both' : 'all'} raised it.`
    : who.length ? `${who[0]} raised it.` : 'It was raised in a check-in.';
  const qualifiesWithIt = withARange.filter((r) => {
    const c = theCriteriaOnRecord(r.fields, r.buyingDate ?? null);
    return !!c.need && !!c['decision maker'] && !!c['buying date'];
  }).length;
  const n = withARange.length;
  const decides = qualifiesWithIt
    ? `It decides whether ${qualifiesWithIt === 1 ? '1 deal counts' : `${qualifiesWithIt} deals count`} as qualified.`
    : `It decides whether ${n === 1 ? '1 deal' : `${n} deals`} can count as qualified.`;
  const route = (yes: boolean) => ({ method: 'POST' as const, path: `/grounds/${groundId}/board/price-range/answer`, body: { yes } });
  return {
    id: 'price-range-counts-as-a-budget',
    says: THE_RANGE_QUESTION,
    decision: { question: THE_RANGE_QUESTION, why: `${raised} ${decides}`, afterwards: 'Your answer goes in how we work, and the board counts the deals by it.' },
    action: {
      label: 'Decide it',
      says: 'Your answer goes in how we work, and the board counts the deals by it.',
      goesTo: null,
      choices: [{ label: 'Yes, it counts', route: route(true) }, { label: 'No', route: route(false) }],
    },
  };
}
