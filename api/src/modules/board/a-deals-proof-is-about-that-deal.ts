import { aLineNamesTheCustomer } from './one-deal-per-customer';
import { aPaymentIsAbout, readsAsAPayment, readsAsASignedOrder } from './a-deals-four-criteria';
import { theContactOf } from './a-deal-that-has-stalled';

/**
 * A DEAL'S PROOF IS ABOUT THAT DEAL (Drop Access, Release 1's first ten-day run, 18 October; findings A1 and A4).
 *
 * Three things on Grace's board said "proof" where the proof was about something else:
 *
 *  - Ngong Road Minimart read "Proof shows it" and counted as paid. Kevin's line "I've also sent out quotes to Savannah Cafe and
 *    Ngong Road Minimart." was backed by the M-Pesa message for Savannah Cafe's deposit ("Ksh15,000.00 received from JANE
 *    MWENDE ... Ref: Savannah Cafe deposit"). The line names Ngong Road Minimart; the document does not. A document that can be
 *    read as words is about the customers it names, never about every customer its line names.
 *  - Kilele Hotel's contact history read "with proof" on 14, 16 and 22 October. Kevin said "Kilele Hotel already bought 40 units."
 *    on those days, and the record backed each line with the M-Pesa message he added on 12 October. A contact is "with proof" only
 *    on the day the proof came in: the day its document was added, or the day a payment reference was typed in full.
 *  - A payment record is a document that reads as a payment and names the customer (or the person they deal with there), or a
 *    payment reference typed in full on a line that names them. A signed order is proof of the order, not of the payment.
 *
 * One rule for every reader: the board's deal rows, the counts of what is sold with proof of payment, and the reports.
 */

export interface ABackingDocument {
  id: string;
  participantId?: string | null;
  fileName?: string | null;
  uploaderNote?: string | null;
  content?: string | null;
  createdAt?: Date | string | null;
}

/** Every backing document the lines name, by its id. A document that cannot be found is left out. */
export async function theBackingDocuments(prisma: any, rows: { anchoredDocumentId?: string | null }[]): Promise<Map<string, ABackingDocument>> {
  const ids = [...new Set(rows.map((r) => r.anchoredDocumentId).filter(Boolean))] as string[];
  if (!ids.length) return new Map();
  const docs = ((await (prisma?.groundDocument?.findMany?.({
    where: { id: { in: ids } },
    select: { id: true, participantId: true, fileName: true, uploaderNote: true, content: true, createdAt: true },
  }) ?? Promise.resolve([])).catch(() => [])) ?? []) as ABackingDocument[];
  return new Map(docs.map((d) => [d.id, d]));
}

/** What a document says, as words: its name, the note it was added with, and its text. */
export function theDocumentsWords(d: ABackingDocument | null | undefined): string {
  return [d?.fileName, d?.uploaderNote, d?.content].filter((x) => !!String(x ?? '').trim()).join(' ');
}

/** Whether a document can be read as words (a text or a message), not only a photo with a file name. */
export function aDocumentHasWords(d: ABackingDocument | null | undefined): boolean {
  return !!String(d?.content ?? '').trim();
}

const squash = (s: string) => (s ?? '').toLowerCase().replace(/[‘’“”'"]/g, '').replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Whether words name this deal: its customer, or the person they deal with there. A document writes names in capitals ("received
 * from KILELE HOTEL LTD", "JANE MWENDE"), so the person is found whatever their capitals.
 */
export function theWordsNameTheDeal(words: string, deal: { name: string; fields?: Record<string, string> | null }): boolean {
  if (aPaymentIsAbout(words, deal) || aLineNamesTheCustomer(words, deal.name)) return true;
  const contact = (theContactOf(deal.fields ?? null) ?? '').split(',')[0].trim();
  if (!/^[A-Z][\p{L}'’-]+(?:\s+[A-Z][\p{L}'’-]+)?$/u.test(contact) || contact.length < 3) return false;
  return ` ${squash(words)} `.includes(` ${squash(contact)} `);
}

/** A line as the proof rules read it: its words, how it is known, and the document behind it, where one is. */
export interface ALineWithItsProof {
  text: string;
  mark: string;
  createdAt: Date | string;
  /** The document's own words, where it can be read as words. */
  documentWords?: string | null;
  /** The day the document was added. */
  documentOn?: Date | string | null;
}

/**
 * Whether a proven line's proof is about this deal: a document that can be read must name the deal; otherwise (a photo, or a
 * payment reference typed in full) the line must.
 */
export function theProofIsAbout(l: Pick<ALineWithItsProof, 'text' | 'documentWords'>, deal: { name: string; fields?: Record<string, string> | null }): boolean {
  return l.documentWords ? theWordsNameTheDeal(l.documentWords, deal) : theWordsNameTheDeal(l.text, deal);
}

const dayKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

/**
 * Whether a line is proof on the day it was said: confirmed by the colleague who received it, or proven by a document added that
 * same day (or a reference typed in full, which has no document). A line said later and backed by an earlier document repeats the
 * proof; it is a contact in their words.
 */
export function aContactWithProof(l: ALineWithItsProof, deal: { name: string; fields?: Record<string, string> | null }): boolean {
  if (l.mark === 'confirmed') return true;
  if (l.mark !== 'proven') return false;
  if (!theProofIsAbout(l, deal)) return false;
  if (!l.documentOn) return true;
  const said = new Date(l.createdAt);
  const added = new Date(l.documentOn);
  if (Number.isNaN(said.getTime()) || Number.isNaN(added.getTime())) return true;
  return dayKey(said) === dayKey(added);
}

/** A proven line, with the document behind it, as the payment rule reads it. */
export interface AProvenLine {
  text: string;
  createdAt: Date | string;
  anchoredDocumentId?: string | null;
}

/**
 * THE PAYMENT RECORDS among the proven lines: each document that reads as a payment (an M-Pesa message, a receipt, a bank's
 * remittance or transfer), and each payment reference typed in full on a line with no document. Each is kept as the words that
 * say whom it is about: the document's own words where it can be read, otherwise the line's.
 */
export function thePaymentRecords(proven: AProvenLine[], docOf: Map<string, ABackingDocument>): { text: string; at: Date }[] {
  const out: { text: string; at: Date }[] = [];
  for (const l of proven) {
    const d = l.anchoredDocumentId ? docOf.get(l.anchoredDocumentId) : undefined;
    if (d) {
      if (!readsAsAPayment(theDocumentsWords(d))) continue;
      out.push({ text: aDocumentHasWords(d) ? theDocumentsWords(d) : `${l.text} ${d.fileName ?? ''}`.trim(), at: new Date(l.createdAt) });
      continue;
    }
    /* No document to read (a reference typed in full, or a document that cannot be found): the line says it. */
    if (readsAsAPayment(l.text)) out.push({ text: l.text, at: new Date(l.createdAt) });
  }
  return out;
}

/**
 * THE SIGNED ORDERS among the proven lines (Hafsah, 18 October, answer 2: Won is met with a signed order or a payment): each
 * document that reads as a signed order (a purchase order, an order signed by the customer), and, with no document, a line that
 * says so with the order's reference typed in full. Kept as the words that say whom it is about, as the payment records are.
 */
export function theSignedOrders(proven: AProvenLine[], docOf: Map<string, ABackingDocument>): { text: string; at: Date }[] {
  const out: { text: string; at: Date }[] = [];
  for (const l of proven) {
    const d = l.anchoredDocumentId ? docOf.get(l.anchoredDocumentId) : undefined;
    if (d) {
      if (!readsAsASignedOrder(theDocumentsWords(d))) continue;
      out.push({ text: aDocumentHasWords(d) ? theDocumentsWords(d) : `${l.text} ${d.fileName ?? ''}`.trim(), at: new Date(l.createdAt) });
      continue;
    }
    if (readsAsASignedOrder(l.text) && /\b(?:L\.?P\.?O|PO)[-\s]?\d{2,}\b/i.test(l.text)) out.push({ text: l.text, at: new Date(l.createdAt) });
  }
  return out;
}

/** Whether one of the payment records is about this deal. */
export function aPaymentRecordFor(deal: { name: string; fields?: Record<string, string> | null }, payments: readonly { text: string }[]): boolean {
  return payments.some((p) => theWordsNameTheDeal(p.text, deal));
}

/**
 * A DEPOSIT IS NOT A FULL PAYMENT (final real-model check, item 10). Jane at Savannah Cafe paid a KES 15,000 deposit on a KES 30,000
 * order, and the board, the morning and the weekly report counted the cafe's 6 units as paid ("6 units, paid", "47 paid", "46 with
 * proof"). Where every payment record about a deal is a deposit, or pays less than the deal is worth, it is a deposit: what was paid, and
 * of what. It still backs the sale (Hafsah, 17 October: "Won: paid, or a deposit received, with a payment record"); it is never said as paid.
 */
export interface ADeposit { paid: number | null; of: number | null; currency: string }
const AMOUNT = /\b(KES|KSh|Ksh|Kshs|USD|NGN|₦|\$)\.?\s?([\d][\d,]*(?:\.\d+)?)\s*(k|thousand|m|million)?\b/i;
const amountIn = (t: string): { amount: number; currency: string } | null => {
  const m = AMOUNT.exec(String(t ?? ''));
  if (!m) return null;
  let n = Number(m[2].replace(/,/g, ''));
  if (/^(k|thousand)$/i.test(m[3] ?? '')) n *= 1e3;
  if (/^(m|million)$/i.test(m[3] ?? '')) n *= 1e6;
  return { amount: n, currency: /^k/i.test(m[1]) ? 'KES' : m[1].toUpperCase() };
};
const valueOf = (fields: Record<string, string> | null | undefined): number | null => {
  const v = Object.entries(fields ?? {}).find(([k]) => /^(?:deal\s+)?(?:value|amount|worth|size|quoted)$/i.test(k.trim()))?.[1];
  const m = v ? /([\d][\d,]*(?:\.\d+)?)\s*(k|thousand|m|million)?/i.exec(String(v)) : null;
  if (!m) return null;
  let n = Number(m[1].replace(/,/g, ''));
  if (/^(k|thousand)$/i.test(m[2] ?? '')) n *= 1e3;
  if (/^(m|million)$/i.test(m[2] ?? '')) n *= 1e6;
  return n;
};
export function theDepositFor(deal: { name: string; fields?: Record<string, string> | null }, payments: readonly { text: string }[]): ADeposit | null {
  const about = payments.filter((p) => theWordsNameTheDeal(p.text, deal));
  if (!about.length) return null;
  const of = valueOf(deal.fields);
  const reads = about.map((p) => ({ deposit: /\bdeposit\b|\badvance\b|\bpart[\s-]payment\b/i.test(p.text), money: amountIn(p.text) }));
  const each = reads.map((r) => r.deposit || (!!r.money && of !== null && r.money.amount < of));
  if (!each.every(Boolean)) return null;
  const paid = reads.map((r) => r.money?.amount ?? 0).reduce((a, b) => Math.max(a, b), 0) || null;
  return { paid, of, currency: reads.find((r) => r.money)?.money?.currency ?? 'KES' };
}
/** "Deposit paid, KES 15,000 of KES 30,000." */
export const aDepositSaid = (d: ADeposit): string => {
  const k = (n: number) => `${d.currency} ${Math.round(n).toLocaleString('en-US')}`;
  return d.paid && d.of ? `Deposit paid, ${k(d.paid)} of ${k(d.of)}.` : d.paid ? `Deposit paid, ${k(d.paid)}.` : 'A deposit is paid.';
};

/** For a served line: the document's words where it can be read, and the day it was added. */
export function theDocumentBehind(anchoredDocumentId: string | null | undefined, docOf: Map<string, ABackingDocument>): { documentWords: string | null; documentOn: Date | null } {
  const d = anchoredDocumentId ? docOf.get(anchoredDocumentId) : undefined;
  if (!d) return { documentWords: null, documentOn: null };
  return { documentWords: aDocumentHasWords(d) ? theDocumentsWords(d) : null, documentOn: d.createdAt ? new Date(d.createdAt) : null };
}

/*
 * AN M-PESA CODE GIVEN IN WORDS IS PROOF OF PAYMENT, AND IS SHOWN AS "M-PESA CODE" (Hafsah, 19 October: "An M-Pesa code given in words
 * counts as proof of payment. Show it as "M-Pesa code", and ask once for the screenshot."). Kevin said on Tuesday 13 October "Kilele
 * Hotel's payment was KES 200,000 via M-Pesa. The confirmation code is QJK4TL2MX9." The line is kept as typed proof
 * (a-typed-reference-backs-its-line) and counts wherever proof of payment counts; where the proof is shown it reads "M-Pesa code
 * QJK4TL2MX9", never "a payment record" or "a document".
 */
/* M-Pesa codes: ten capitals and digits, with at least two letters and one digit ("QJK4TL2MX9"), as a-typed-reference-backs-its-line reads them. */
const AN_MPESA_CODE = /\b(?=[A-Z0-9]{10}\b)(?=[A-Z0-9]*\d)(?=(?:[0-9]*[A-Z]){2})[A-Z0-9]{10}\b/g;

/** The M-Pesa codes typed in a line, once each. */
export function theMPesaCodesIn(text: string | null | undefined): string[] {
  return [...new Set(String(text ?? '').match(AN_MPESA_CODE) ?? [])];
}

/**
 * The M-Pesa code typed for this deal: on a line with no document that names the deal and reads as a payment. Null where the payment
 * record is a document (an M-Pesa message, a receipt), or there is none.
 */
export function theMPesaCodeFor(deal: { name: string; fields?: Record<string, string> | null }, lines: readonly { text: string; anchoredDocumentId?: string | null }[]): string | null {
  for (const l of lines) {
    if (l.anchoredDocumentId) continue;
    const text = String(l.text ?? '');
    const codes = theMPesaCodesIn(text);
    if (!codes.length || !readsAsAPayment(text) || !theWordsNameTheDeal(text, deal)) continue;
    return codes[0];
  }
  return null;
}

/** How the proof of a payment typed as an M-Pesa code is said: "M-Pesa code QJK4TL2MX9". */
export const anMPesaCode = (code: string) => `M-Pesa code ${code}`;
