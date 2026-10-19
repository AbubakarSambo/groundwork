import { aLineNamesTheCustomer } from '../board/one-deal-per-customer';
import type { ADealOnRecord } from '../board/a-sales-aim-is-counted-from-the-deals';

/**
 * PROOF ON FILE IS NEVER ASKED FOR AGAIN, AND NEVER SAID TO BE MISSING (engine test, second run, Drop Access, Monday 12 October).
 *
 * Kevin sent the M-Pesa message for Kilele Hotel in his first check-in ("QJK4TL2MX9 Confirmed. Ksh200,000.00 received from KILELE HOTEL
 * LTD"), and the board read it and marked his line proven. The judgement on the same board told Grace "Ask Kevin Omondi for the document
 * showing a signed order or proof of payment for the 40-unit Kilele Hotel order", and "The record shows that Kevin Omondi reported the
 * order and provided a document, but not whether payment has been made or an order signed". The judgement had been told a document was
 * there, never what it showed.
 *
 * Two parts, in the order the rules ask for. First the model is given the fact: for each sale on record, what is on file for it (a
 * payment record, a signed order, a document that shows neither, or nothing written), from the deals on record, the same rows the
 * headline counts. Then, on what is stored, a line the record proves false is left out: a move that asks somebody for the proof of a
 * sale whose payment record (or signed order, when that is all it asks for) is on file, and a "cannot tell you" that says whether it
 * was paid cannot be known, for a sale with a payment record. Nothing is written in their place; every other line stands as written.
 */

export interface ASaleAndItsProof {
  name: string;
  ownerParticipantId: string | null;
  paid: boolean;
  signed: boolean;
  proven: boolean;
}

/** The won deals, with what backs each. */
export function theSalesAndTheirProof(deals: readonly ADealOnRecord[], lastStage = 'Won'): ASaleAndItsProof[] {
  return deals
    .filter((d) => String(d.stage ?? '').trim().toLowerCase() === lastStage.trim().toLowerCase() && !d.dropped)
    .map((d) => ({ name: d.name, ownerParticipantId: d.ownerParticipantId, paid: !!d.paid, signed: !!d.signed, proven: !!d.proven }));
}

/** The block the judgement reads: one plain sentence for each sale, naming whose it is. Empty where there is no sale. */
export function whatIsOnFileForEachSale(sales: readonly ASaleAndItsProof[], whoIs: (participantId: string | null) => string | null): string {
  if (!sales.length) return '';
  const lines = sales.map((s) => {
    const who = whoIs(s.ownerParticipantId);
    const whose = who ? `${s.name}, a sale ${who} said was made` : s.name;
    if (s.paid) return `  ${whose}: a payment record for it is on file. Do not ask for its proof, and do not say its payment cannot be known.`;
    if (s.signed) return `  ${whose}: a signed order for it is on file, and no payment record yet.`;
    if (s.proven) return `  ${whose}: a document backs it, but it does not show a payment or a signed order.`;
    return `  ${whose}: nothing written is on file for it, only what was said.`;
  });
  return ['WHAT IS ON FILE FOR EACH SALE, read from the record. A sale with a payment record on file is proven.', ...lines].join('\n');
}

const ASKS = /\b(?:ask|asks|get|request|obtain|see|collect|chase|confirm|check|verify|find out|follow up)\b/i;
const PROOF = /\b(?:proof|document|documents|receipt|m-?pesa|payment record|evidence|signed order|signed agreement|confirmation of payment)\b/i;
const ONLY_A_SIGNED_ORDER = /\bsigned (?:order|agreement)\b/i;
const ABOUT_PAYMENT = /\b(?:paid|payment|pays|proof|signed)\b/i;

const theSalesNamedIn = (text: string, sales: readonly ASaleAndItsProof[]) => sales.filter((s) => aLineNamesTheCustomer(text, s.name));

/** A move that asks for proof the record already holds for every sale it names. */
function asksForProofOnFile(text: string, sales: readonly ASaleAndItsProof[]): boolean {
  if (!ASKS.test(text) || !PROOF.test(text)) return false;
  const named = theSalesNamedIn(text, sales);
  if (!named.length) return false;
  const payment = /\b(?:payment|paid|m-?pesa|receipt)\b/i.test(text);
  return named.every((s) => s.paid || (s.signed && ONLY_A_SIGNED_ORDER.test(text) && !payment));
}

/** The judgement with the lines the record proves false left out, and what was left out, for the log. */
export function withoutAsksForProofOnFile<J extends Record<string, any>>(judgement: J, sales: readonly ASaleAndItsProof[]): { judgement: J; leftOut: string[] } {
  if (!judgement || !sales.some((s) => s.paid || s.signed)) return { judgement, leftOut: [] };
  const leftOut: string[] = [];
  const out: any = { ...judgement };
  if (Array.isArray(out.whatToDo)) {
    out.whatToDo = (out.whatToDo as any[]).filter((x) => {
      const gone = asksForProofOnFile(String(x?.move ?? ''), sales);
      if (gone) leftOut.push(String(x?.move ?? ''));
      return !gone;
    });
  }
  if (Array.isArray(out.whatThisCannotTellYou)) {
    out.whatThisCannotTellYou = (out.whatThisCannotTellYou as any[]).filter((x) => {
      const all = [x?.why, x?.about, x?.toKnow].map((t) => String(t ?? '')).join(' ');
      const named = theSalesNamedIn(all, sales);
      const gone = named.length > 0 && ABOUT_PAYMENT.test(all) && named.every((s) => s.paid);
      if (gone) leftOut.push(String(x?.about ?? x?.why ?? ''));
      return !gone;
    });
  }
  return { judgement: out as J, leftOut };
}
