/**
 * WHAT THEY TRIED, AND WHETHER IT WAS FIRST (the final real-model check, items 6 and 18).
 *
 * "Try one thing before you raise a blocker" is about what somebody had done by the time they raised it.
 *  - Brian raised "the signed verifying affidavit" on Monday 12 October, saying "I was assuming they would send it. I'll reach out to them
 *    now." On Wednesday he said "I did follow up yesterday". His record dated that Wednesday line Monday and counted it as tried first.
 *    It was tried, after the blocker was raised: not first.
 *  - Aisha chased the client for the witness statements on Monday ("reached out to their HR manager this morning") and Tuesday ("I'm still
 *    following up on the last one"). On Wednesday the same wait was kept as a new row, "the last witness statement" from the HR manager, with
 *    nothing tried on it, and she was coached on raising blockers with nothing tried. What she tried on the same thing counts for it.
 *
 * THE RULE. What they tried on a wait is the earliest thing they said they tried on it, or on another of their own waits for the same thing
 * (the same words of the thing, at least two). It is dated by the turn of theirs that holds those words. It was first when it was said on or
 * before the day the wait was raised. Where they said on the wait itself that nothing was tried, nothing else stands in for it: Brian's "I have
 * not yet checked with them" about a fix for the e-filing portal is not answered by his "I tried at 4pm" about filing the day before.
 */
import { saidWhatTheyTried } from '../grounds/a-wait-is-the-speakers-account';

export interface AWaitOfTheirs {
  id: string;
  what: string;
  triedSaid?: string | null;
  createdAt: Date | string;
  fromParticipantId?: string | null;
}
export interface ATurnOfTheirs { content: string; at: Date | string }

const ORDINARY = new Set(['the', 'a', 'an', 'for', 'of', 'on', 'to', 'from', 'with', 'and', 'or', 'my', 'our', 'their', 'his', 'her', 'its', 'this', 'that', 'some', 'any', 'about', 'in', 'at', 'by', 'it', 'last', 'first', 'next', 'more', 'still', 'other']);
const one = (w: string) => w.replace(/ies$/, 'y').replace(/([^s])s$/, '$1');
const thingWords = (x: string) => new Set(String(x ?? '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !ORDINARY.has(w)).map(one));
const flat = (x: string) => String(x ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const dayKey = (d: Date | string, zone: string) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d));

/** Two of their waits are for the same thing when they share at least two of the thing's own words ("witness statement"). */
export function theSameThing(a: string, b: string): boolean {
  const x = thingWords(a);
  let n = 0;
  for (const w of thingWords(b)) if (x.has(w)) n++;
  return n >= 2;
}

/** When they said these words, from their own turns; null where no turn of theirs holds them. */
export function whenTheySaid(words: string, turns: readonly ATurnOfTheirs[]): Date | null {
  const w = flat(words);
  if (w.length < 6) return null;
  const hit = turns.find((x) => flat(x.content).includes(w));
  return hit ? new Date(hit.at) : null;
}

export function whatTheyTriedFirst(
  d: AWaitOfTheirs, theirWaits: readonly AWaitOfTheirs[], turns: readonly ATurnOfTheirs[], zone: string,
): { tried: string | null; triedAt: Date | null; first: boolean } {
  /* Where they said on this wait that nothing was tried ("I have not yet checked with them"), that is what stands for it. */
  const saidNothing = !!String(d.triedSaid ?? '').trim() && !saidWhatTheyTried(d.triedSaid);
  const same = saidNothing ? [d] : [d, ...theirWaits.filter((x) => x.id !== d.id && (!d.fromParticipantId || x.fromParticipantId === d.fromParticipantId) && theSameThing(x.what, d.what))];
  const tries = same
    .filter((x) => saidWhatTheyTried(x.triedSaid))
    .map((x) => ({ tried: String(x.triedSaid).trim(), at: whenTheySaid(String(x.triedSaid), turns) ?? new Date(x.createdAt) }))
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  const raised = dayKey(d.createdAt, zone);
  const byThen = tries.find((x) => dayKey(x.at, zone) <= raised);
  const pick = byThen ?? tries[0] ?? null;
  return { tried: pick?.tried ?? null, triedAt: pick?.at ?? null, first: !!byThen };
}
