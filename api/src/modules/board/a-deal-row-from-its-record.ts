import { aLineIsAbout } from './a-deals-value-and-buying-date';
import { aContactWithProof } from './a-deals-proof-is-about-that-deal';
import { theDayInWords } from './the-day-in-words';

/**
 * WHAT A DEAL ROW NEEDS TO BE THE PROTOTYPE'S DEAL (request 115 b; board-as-lead.txt: "Eastside Foods, KES
 * 110,000, Proven, Aisha, last contact yesterday. Why it's here. ... Contact history 22 Sep With proof, 17 Sep
 * In their words ... Aisha's read, in their words: "They'll buy this month. The owner said so twice."").
 *
 * ONLY FROM WHAT THE RECORD HOLDS, and where it holds nothing, said plainly:
 *  - VALUE: a detail kept with the deal from the line that named it ("Value", "Amount", "Worth"). Where none
 *    was said: "Nobody has said what this deal is worth yet."
 *  - CONTACT HISTORY: each day somebody spoke about the deal in a check-in (a line that names it), with proof
 *    where a document backs that line or a colleague confirmed it, otherwise in their words. The record does
 *    not hold each contact with the customer, so `contactHistorySays` says what the dates are.
 *  - THE REP'S READ, IN THEIR OWN WORDS: the latest sentence the deal's owner typed that names it, word for
 *    word, never changed. Only where this reader may read that person's words.
 *  - WHY IT IS IN ITS GROUP: `groupSays`, already on the row (request 112 a).
 *  - CRITERIA MET: nothing on record says what a deal must show at each stage. The grid's `groupsNote` says
 *    so once; no row claims a criterion.
 */
export const WHAT_CONTACT_HISTORY_IS = 'Each date is a day somebody spoke about this deal in a check-in. Nothing on record holds each contact with the customer.';
export const NO_VALUE_SAID = 'Nobody has said what this deal is worth yet.';

const VALUE_KEY = /^(?:deal\s+)?(?:value|amount|worth|size)$/i;
const squash = (s: string) => (s ?? '').toLowerCase().replace(/[‘’“”'"]/g, '').replace(/\s+/g, ' ').trim();

export function theValueOf(fields: Record<string, string> | null | undefined): string | null {
  for (const [k, v] of Object.entries(fields ?? {})) if (VALUE_KEY.test(k.trim()) && String(v ?? '').trim()) return String(v).trim();
  return null;
}

export interface ALineAboutDeals {
  id: string;
  participantId: string | null;
  text: string;
  createdAt: Date | string;
  /** The line's mark: 'proven' where a document backs it, 'confirmed' where a colleague did. */
  mark: string;
  /** The words of the document behind it, where it can be read, and the day it was added (a-deals-proof-is-about-that-deal). */
  documentWords?: string | null;
  documentOn?: Date | string | null;
}

const dayKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

/** Each day the deal was spoken about, newest first, one entry a day (proof wins over words on the same day). */
export function theContactHistory(name: string, lines: ALineAboutDeals[], now: Date, fields: Record<string, string> | null = null, peopleThere: readonly string[] = []): { on: string; how: 'with proof' | 'in their words'; says: string }[] {
  const key = squash(name);
  if (!key) return [];
  const byDay = new Map<string, { at: Date; proof: boolean }>();
  /* And a line naming a person the record ties to the customer ("Wanjiru says she won't buy this month." for Mama Pima; Drop Access run 1, A3). */
  const namesSomebodyThere = (t: string) => peopleThere.some((p) => aLineIsAbout(t, { name: '', fields: { Contact: p } }));
  for (const l of lines) {
    /* With the deal's details given (Release 1's sales board), a line naming only the person at the customer is about it too (point 6). */
    if (!squash(l.text).includes(key) && !(fields && aLineIsAbout(l.text, { name, fields })) && !(fields && namesSomebodyThere(l.text))) continue;
    const at = new Date(l.createdAt);
    if (isNaN(at.getTime())) continue;
    const k = dayKey(at);
    /* With proof only on the day the proof came in, and only where the proof is about this deal (Drop Access run 1, A4). */
    const proof = aContactWithProof(l, { name, fields });
    const had = byDay.get(k);
    byDay.set(k, { at: had?.at ?? at, proof: (had?.proof ?? false) || proof });
  }
  return [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([on, { at, proof }]) => ({
      on,
      how: proof ? 'with proof' as const : 'in their words' as const,
      says: proof
        ? `On ${theDayInWords(at, now)}, somebody spoke about it, and proof backs what they said.`
        : `On ${theDayInWords(at, now)}, somebody spoke about it, in their own words.`,
    }));
}

/** The sentences of a turn, exactly as typed. */
function sentencesOf(turn: string): string[] {
  return (turn ?? '').split(/\n+/).flatMap((line) => line.match(/[^.!?]+(?:[.!?]+|$)/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

/**
 * The latest sentence the owner typed that names the deal, word for word. Null where none does.
 *
 * ONE CUSTOMER'S READ IS ABOUT THAT CUSTOMER (Drop Access run 1, A4). Kilele Hotel's card read Kevin's "Kilele Hotel bought 40
 * units and Savannah Cafe got its 6 units today.", half of which is Savannah Cafe's. With the other deals on record given, a
 * sentence that names another of them too is cut to its own part ("Kilele Hotel bought 40 units."), still in the owner's words;
 * where it cannot be cut, an earlier sentence is read instead.
 */
export function theirReadInTheirWords(name: string, theirTurns: string[], otherDeals: readonly string[] = []): string | null {
  const key = squash(name);
  if (!key) return null;
  const others = otherDeals.map(squash).filter((o) => o && o !== key && !o.includes(key) && !key.includes(o));
  const namesAnother = (s: string) => others.some((o) => squash(s).includes(o));
  for (let i = theirTurns.length - 1; i >= 0; i--) {
    const found = sentencesOf(theirTurns[i]).filter((s) => squash(s).includes(key));
    for (let j = found.length - 1; j >= 0; j--) {
      const s = found[j];
      if (!namesAnother(s)) return s;
      const own = s.split(/,\s+(?:and\s+|but\s+)?|;\s+|\s+(?:and|but)\s+/).map((c) => c.trim()).filter((c) => squash(c).includes(key) && !namesAnother(c));
      if (own.length === 1) return /[.!?]$/.test(own[0]) ? own[0] : `${own[0]}.`;
    }
  }
  return null;
}
