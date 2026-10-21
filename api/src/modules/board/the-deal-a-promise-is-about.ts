/**
 * THE DEAL A PROMISE IS ABOUT, FROM THE CONVERSATION IT WAS MADE IN (coordinator's follow-up to the final real-model check, 21 October 2026).
 *
 * Kevin was asked "What specifically do you mean by "next week" for Ngong Road Minimart - which day should Ali get back to you?" and answered
 * "He didn't specify a day, just "next week." I'll follow up with him on Monday." He was asked "What is the next thing you will do for Upper
 * Hill Offices, and by when?" and answered "I'll send Paul a follow-up email by end of day today, ...". The promises were kept as "I'll follow
 * up with him" (on Monday) and "I'll send Paul a follow-up email" (by end of day today), naming neither deal, so both deal rows said "Nothing
 * booked" and his My work said "Planning ahead: Needs work. 2 of your 2 open deals have no next step with a day."
 *
 * THE RULE. A promise is about one of its maker's deals when its own words name that deal; otherwise when the turn of theirs that holds the
 * promise, or the question it answered, names exactly one of their deals. Where none, or two, are named, it is about no deal: never a guess.
 */
import { aLineNamesTheCustomer } from './one-deal-per-customer';

export interface APromiseOnRecord { id: string; participantId: string | null; text: string; createdAt: Date | string }
export interface ATurnOnRecord { checkInId: string | null; participantId: string | null; role: string; content: string; createdAt: Date | string }

const flat = (x: string) => String(x ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
/* The promise's own words, without the "I'll" or "I will" it starts with, so they are found inside what was typed. */
const itsWords = (t: string) => flat(t).replace(/^(?:i ?'ll|i will|i shall|i am going to|i'm going to|we'll|we will)\s+/, '');

export function theDealsThePromisesAreAbout(
  promises: readonly APromiseOnRecord[],
  turns: readonly ATurnOnRecord[],
  deals: readonly { name: string; ownerParticipantId: string | null }[],
): Map<string, string> {
  const out = new Map<string, string>();
  const sorted = [...turns].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  for (const p of promises) {
    const theirs = deals.filter((d) => !p.participantId || d.ownerParticipantId === p.participantId);
    const one = (text: string) => { const named = theirs.filter((d) => aLineNamesTheCustomer(text, d.name)); return named.length === 1 ? named[0].name : null; };
    const own = one(p.text);
    if (own) { out.set(p.id, own); continue; }
    const words = itsWords(p.text);
    if (words.length < 6) continue;
    const at = sorted.findIndex((t) => t.role === 'PERSON' && (!p.participantId || t.participantId === p.participantId) && flat(t.content).includes(words));
    if (at < 0) continue;
    const said = one(sorted[at].content);
    if (said) { out.set(p.id, said); continue; }
    const asked = [...sorted.slice(0, at)].reverse().find((t) => t.role === 'AI' && t.checkInId === sorted[at].checkInId);
    /* The question itself first ("What is the next thing you will do for Upper Hill Offices, and by when?"), then the whole turn. */
    const question = asked ? (String(asked.content).split(/(?<=[.!?])\s+/).filter((x) => /\?\s*$/.test(x)).pop() ?? '') : '';
    const fromTheQuestion = asked ? (one(question) ?? one(asked.content)) : null;
    if (fromTheQuestion) out.set(p.id, fromTheQuestion);
  }
  return out;
}
