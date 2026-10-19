/**
 * COLLECT WHAT'S OWED (COLLECTIONS, working label): THE SCENARIO'S OWN FACTS, IN ONE PLACE (release plan, Release 2).
 *
 * "A firm knows which fee notes are due, why each one is due (a date, or an event in the matter), what's been paid with proof,
 * and what's in the way, without anyone chasing a spreadsheet. A lender sees who's repaying and why not."
 *
 * WHERE EACH FACT COMES FROM.
 *  - The stages, what each needs, the proof and the stall rule: the prototype's template "Finance · collections and close"
 *    (SEED.TPL, id "finance"), with its ladder Invoiced, Due, Reminded, Chased, Promised, Paid.
 *  - The two types, the organisation's own word for the bill and the detection words: the release plan, Release 2.
 *  - The labels a lead reads for the two types: the B8 picture people-and-setup-fee-notes-lead ("Fee notes and invoices",
 *    "Loan repayments").
 *  - The default cadence: the prototype's SIT_SCHED has no row for this scenario, so it takes the weekly rhythm of the
 *    collections check-in in the release plan (Muchemi & Co's weekly collections check-in) and the twelve-week clock a weekly
 *    situation already has here (TEAM_UPDATES). Listed for Hafsah in docs/release-questions.md.
 *
 * WHAT IT IS NOT. It is offered only where the organisation's Release 2 switch is on (release-2-collections.ts), and only to a
 * new check-in. The stall rule applies only once the lead confirms it (Hafsah's standing decision 4, 18 October): until then it
 * is offered as a suggestion, and nothing is marked stalled by it.
 */

/** The working label a person reads, as the release plan writes it. */
export const COLLECT_WHATS_OWED = 'Collect what’s owed';

/** The one line under it in the picker, in a full sentence. */
export const COLLECT_WHATS_OWED_ONE_LINE = 'Which bills are due, what has been paid with proof, and what is in the way.';

/** The two types (release plan, Release 2), as the switchboard keys them. */
export const COLLECTIONS_TYPES = ['invoices or fee notes', 'loans'] as const;
export type ACollectionsType = (typeof COLLECTIONS_TYPES)[number];

/** What a lead reads for each type, as the B8 picture draws them under "Kind of work". */
export const COLLECTIONS_TYPE_LABEL: Record<ACollectionsType, string> = {
  'invoices or fee notes': 'Fee notes and invoices',
  loans: 'Loan repayments',
};

/** Who checks in, for each type (release plan, Release 2). */
export const WHO_CHECKS_IN: Record<ACollectionsType, string> = {
  'invoices or fee notes': 'The people who follow up the clients check in.',
  loans: 'The people who owe check in themselves.',
};

/** The organisation's word for a bill, where it has none. */
export const THE_DEFAULT_BILL_WORD = 'invoice';

/**
 * THE ORGANISATION'S OWN WORD FOR A BILL: "fee note" for Muchemi & Co, "invoice" where nobody has said. Lower case, as it sits
 * in the middle of a sentence; trimmed and kept short so a stored word can never carry a sentence of its own.
 */
export function theWordForTheBill(org: { billWord?: string | null } | null | undefined): string {
  const w = String(org?.billWord ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  return w && w.length <= 30 && /^[\p{L}][\p{L} '-]*$/u.test(w) ? w : THE_DEFAULT_BILL_WORD;
}

/** The plural, for "Which fee notes are due". */
export function theBillsPlural(word: string): string {
  return /s$/.test(word) ? word : `${word}s`;
}

/** What a stored or sent word for the bill must be: a word or two, letters only. Null clears it back to "invoice". */
export function aWordForTheBillMayBe(v: unknown): { ok: true; word: string | null } | { ok: false; says: string } {
  if (v === null || v === undefined || (typeof v === 'string' && !v.trim())) return { ok: true, word: null };
  if (typeof v !== 'string') return { ok: false, says: 'Write the word your organisation uses for a bill, for example fee note or invoice.' };
  const w = v.trim().replace(/\s+/g, ' ').toLowerCase();
  if (w.length > 30 || !/^[\p{L}][\p{L} '-]*$/u.test(w)) {
    return { ok: false, says: 'Write the word your organisation uses for a bill in a word or two, with letters only, for example fee note or invoice.' };
  }
  return { ok: true, word: w };
}

/**
 * THE STAGES, IN ORDER, FROM THE TEMPLATE'S LADDER. `needs` is what makes a bill reach the stage, `proof` the kind of record
 * that shows it, and `asks` the question the template puts to a person. Each is a full sentence; the bill's own word is put in
 * where the template says "invoice".
 */
export interface ACollectionsStage {
  stage: 'Invoiced' | 'Due' | 'Reminded' | 'Chased' | 'Promised' | 'Paid';
  needs: (bill: string) => string;
  proof: string;
  asks: (bill: string) => string;
}

export const COLLECTIONS_STAGES: readonly ACollectionsStage[] = [
  { stage: 'Invoiced', needs: (b) => `The ${b} has been sent, with its amount and the day it is due.`, proof: 'The accounting system.', asks: (b) => `Which ${theBillsPlural(b)} went out today?` },
  { stage: 'Due', needs: () => 'The day it is due has been reached.', proof: 'The accounting system.', asks: () => 'Which debts fell due?' },
  { stage: 'Reminded', needs: () => 'A written reminder has been sent.', proof: 'An email or a statement.', asks: () => 'Who got a reminder?' },
  { stage: 'Chased', needs: () => 'Somebody spoke to a named person at the client.', proof: 'A note of the call.', asks: () => 'Who did you speak to, and what did they say?' },
  { stage: 'Promised', needs: () => 'The client gave a date they will pay by.', proof: 'Their message.', asks: () => 'What date did they promise?' },
  { stage: 'Paid', needs: () => 'The money has been received.', proof: 'A bank or M-Pesa record.', asks: (b) => `What came in, and against which ${b}?` },
];

export const COLLECTIONS_STAGE_NAMES = COLLECTIONS_STAGES.map((s) => s.stage);

/**
 * WHAT COUNTS AS PROOF THAT A BILL WAS PAID (release plan, Release 2: "Proof from the accounting system, a bank slip or an
 * M-Pesa message"; "Paid means proof", otherwise it is "said"). In the words a lead reads.
 */
export const COLLECTIONS_PROOF_KINDS: Record<ACollectionsType, readonly string[]> = {
  'invoices or fee notes': ['a record in the accounting system', 'a bank slip', 'an M-Pesa message'],
  loans: ['a repayment record', 'a bank slip', 'an M-Pesa message'],
};

/**
 * THE STALL RULE (the template's "A promised payment date passes without payment"). Offered to the lead as the suggested
 * default; it applies only once she confirms it, and it is then kept in how we work as this line.
 */
export const THE_COLLECTIONS_STALL_RULE_CARD = 'the-collections-stall-rule';
export const theCollectionsStallRuleAsALine = (bill: string) => `A ${bill} is stalled when the date the client promised to pay by passes without payment.`;
export const theCollectionsStallRuleDeclined = 'Groundwork offered a stall rule for promised payments, and you said not now. Nothing is marked stalled for a missed promise.';
export const THE_COLLECTIONS_STALL_RULE_NOTE = 'Until you set a stall rule, nothing is marked stalled when a promised date passes.';

const A_COLLECTIONS_RULE = /\bstalled\b[^.]*\bpromised\b[^.]*\bpasses\b/i;

/** The collections stall rule, from how we work: set, said not now, or neither. Read only from the lines; nothing else sets it. */
export function theCollectionsStallRuleIn(lines: readonly { text?: string | null; kind?: string | null; closedAt?: Date | string | null }[]): { set: boolean; declined: boolean } {
  let set = false;
  let declined = false;
  for (const l of lines) {
    if (l.closedAt) continue;
    if (l.kind && String(l.kind).toUpperCase() !== 'WAY_OF_WORKING') continue;
    const t = String(l.text ?? '').trim();
    if (t === theCollectionsStallRuleDeclined) { declined = true; continue; }
    if (A_COLLECTIONS_RULE.test(t)) set = true;
  }
  return { set, declined: declined && !set };
}

/**
 * THE DETECTION WORDS (release plan, Release 2): collect, owed, invoice, fee note, debtor, repay, loan, credit. A word is matched
 * whole, with its ordinary endings ("invoices", "repayments", "debtors", "collecting"), never inside another word ("recollect"
 * does not count, nor does "credible").
 */
export const COLLECTIONS_DETECTION_WORDS = ['collect', 'owed', 'invoice', 'fee note', 'debtor', 'repay', 'loan', 'credit'] as const;
const DETECTS = /\b(?:collect(?:s|ed|ing|ions?)?|owed|owing|invoic(?:e|es|ed|ing)|fee[- ]?notes?|debtors?|repa(?:y|ys|id|ying|yments?)|loans?|credit(?:s|ors?)?)\b/i;

export function soundsLikeCollectingWhatsOwed(words: string | null | undefined): boolean {
  return DETECTS.test(String(words ?? ''));
}

/* What tells the two types apart in what the lead wrote. */
const SAYS_LOANS = /\b(?:loans?|repa(?:y|ys|id|ying|yments?)|borrow(?:s|ed|er|ers|ing)?|lend(?:s|er|ers|ing)?|credit|disburs(?:e|ed|ement|ements)|instal(?:l)?ments?)\b/gi;
const SAYS_BILLS = /\b(?:invoic(?:e|es|ed|ing)|fee[- ]?notes?|debtors?|bills?|billing|receivables?)\b/gi;

/**
 * THE TYPE, FROM WHAT THE LEAD WROTE AND THE ORGANISATION'S RECORD, OR NOTHING. Never written by itself: it is what "What it is"
 * offers the lead to confirm. The lead's words decide where they lean one way; where they say nothing either way, the
 * organisation's record does (a word for the bill of its own, or a type its leads already confirmed on another collections
 * check-in). Where neither says, it is left for the lead to choose: a guessed type would pick the wrong board.
 */
export function theCollectionsTypeRead(input: {
  words?: string | null;
  billWord?: string | null;
  typesConfirmedHere?: readonly string[];
}): { type: ACollectionsType; from: 'your words' | 'your organisation' } | null {
  const words = String(input.words ?? '');
  const loans = (words.match(SAYS_LOANS) ?? []).length;
  const bills = (words.match(SAYS_BILLS) ?? []).length + (input.billWord && words.toLowerCase().includes(String(input.billWord).toLowerCase()) ? 1 : 0);
  if (loans > bills) return { type: 'loans', from: 'your words' };
  if (bills > loans) return { type: 'invoices or fee notes', from: 'your words' };
  const confirmed = (input.typesConfirmedHere ?? []).filter((t): t is ACollectionsType => (COLLECTIONS_TYPES as readonly string[]).includes(t));
  if (confirmed.length && confirmed.every((t) => t === confirmed[0])) return { type: confirmed[0], from: 'your organisation' };
  if (String(input.billWord ?? '').trim()) return { type: 'invoices or fee notes', from: 'your organisation' };
  return null;
}

/** The default rhythm for a new check-in (see the note at the top). An existing check-in keeps its own. */
export const COLLECTIONS_DEFAULT_CADENCE = 'WEEKLY' as const;
export const COLLECTIONS_DEFAULT_TIMELINE_DAYS = 90;
