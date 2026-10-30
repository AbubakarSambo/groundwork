import { inOurVoice } from '../reports/what-the-record-shows-over-time';
import type { HowALineIsKnown } from '../reports/how-a-line-is-known';

/**
 * EACH RECORD'S "NEXT", AND HOW IT IS KNOWN (request 107 c; the prototype's record grid: "Ringed is
 * someone's word; filled is proven", "Proof shows it", "Someone said it", and a Next column).
 *
 * NEVER INVENTED. How a record is known is the mark of the line it came from, the same mark every line
 * carries (how-a-line-is-known): a document behind it is proof; anything else is somebody's word; a
 * record the lead typed is the lead's. What happens next is only what somebody said they would do
 * about it: an open commitment whose words name the record.
 * Where nobody has said, the record says so, and nothing is made up to fill the column.
 */
export interface HowItIsKnown {
  known: 'proof' | 'said' | 'lead';
  knownSays: string;
}

export function howARecordIsKnown(mark: HowALineIsKnown | null, readerAddedIt: boolean): HowItIsKnown {
  if (mark == null) return { known: 'lead', knownSays: readerAddedIt ? 'You added it on the board.' : 'It was added on the board, not said in a check-in.' };
  if (mark === 'proven') return { known: 'proof', knownSays: 'Proof shows it.' };
  return { known: 'said', knownSays: 'Someone said it.' };
}

/**
 * THE MARK A RECORD ROW CARRIES (request 108 c; the prototype's key, "Ringed is someone's word; filled is
 * proven"). The same shape the screens' ProofMark reads: the mark of the line the record came from, as
 * every line on the board is marked (how-a-line-is-known), so a document or photo the person added behind
 * it is `proven`, a colleague who received it saying it arrived is `confirmed`, a figure about what
 * happened with nothing attached is `memory`, and anything else is `said`. A record added on the board has
 * no line behind it, so it is `none`. Nothing upgrades it: a record is never marked stronger than its line.
 */
export type ARecordsMark = HowALineIsKnown | 'none';

export function theRecordsMark(lineMark: HowALineIsKnown | null): ARecordsMark {
  return lineMark ?? 'none';
}

export interface WhatComesNext {
  next: string | null;
  /** The step alone, short, the way the prototype's Next step column reads it ("Send the quote, with a photo"). The sentence above says whose it is. */
  nextStep?: string | null;
  nextKnown: 'said' | null;
  nextSays: string;
}

const squash = (t: string) => (t ?? '').toLowerCase().replace(/[‘’“”'"]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

export function whatHappensNext(
  record: { name: string },
  openPromises: { participantId: string | null; text: string; whenSaid?: string | null; about?: string | null }[],
  whoIs: (participantId: string | null) => string,
): WhatComesNext {
  const name = squash(record.name);
  /* Named in its words, or about this deal by the conversation it was made in (the-deal-a-promise-is-about). */
  const named = name.length >= 3 ? openPromises.find((c) => ` ${squash(c.text)} `.includes(` ${name} `)) : undefined;
  /* One about it only by its conversation is used where it can be said as a step; otherwise the deal's own next step stands. */
  const byItsConversation = !named && name.length >= 3 ? openPromises.find((c) => !!c.about && squash(c.about) === name && !!inOurVoice(c.text, 'them')) : undefined;
  const promise = named ?? byItsConversation;
  if (promise) {
    const who = whoIs(promise.participantId);
    /* With the day they gave, where it is kept beside the words and not in them ("I'll follow up with him", "on Monday"). */
    const when = String(promise.whenSaid ?? '').trim().replace(/[.\s]+$/, '');
    const text = when && !squash(promise.text).includes(squash(when)) ? `${promise.text.trim().replace(/[.\s]+$/, '')} ${when}` : promise.text;
    const clause = inOurVoice(text, who === 'You' ? 'you' : 'them');
    const says = clause ? `${who} committed to ${clause}.` : `${who} made a commitment about it, which is in the record.`;
    return { next: says, nextStep: clause ? aStepOnItsOwn(clause) : null, nextKnown: 'said', nextSays: says };
  }
  return { next: null, nextKnown: null, nextSays: 'Nobody has said what happens next.' };
}

/**
 * THE NEXT STEP AS THE DEAL'S OWN LINE SAID IT (Hafsah, 16 October 2026). Where no open commitment names the customer, the next
 * step said about the deal in a check-in, kept with it as "Next step" (and "Next step by"), is the deal's next step, in that
 * person's words and said as theirs. Nothing is made up: with neither, the deal still says nobody has said.
 */
export function theNextStepTheyGave(fields: Record<string, string> | null | undefined, who: string | null): WhatComesNext | null {
  const step = String(fields?.['Next step'] ?? '').trim().replace(/[.\s]+$/, '');
  if (!step || !who) return null;
  const by = String(fields?.['Next step by'] ?? '').trim().replace(/[.\s]+$/, '');
  const quoted = `“${step.charAt(0).toLowerCase()}${step.slice(1)}”`;
  const already = by && step.toLowerCase().includes(by.toLowerCase());
  const says = `${who === 'You' ? 'You' : who} said the next step is ${quoted}${by && !already ? `, by ${by}` : ''}.`;
  return { next: says, nextStep: aStepOnItsOwn(by && !already ? `${step}, by ${by}` : step), nextKnown: 'said', nextSays: says };
}

/** "send the quote, with a photo" as the column reads it: "Send the quote, with a photo". In about eight words (Hafsah, 25 October). */
export function aStepOnItsOwn(step: string): string {
  const t = inAboutEightWords(step.trim().replace(/[.\s]+$/, ''));
  return t ? `${t.charAt(0).toUpperCase()}${t.slice(1)}` : t;
}

const BREAK_BEFORE = new Set(['and', 'so', 'because', 'but', 'which', 'who', 'until', 'since', 'as', 'while', 'if', 'then']);
const PHRASE_BEFORE = new Set(['for', 'on', 'about', 'with', 'regarding', 'to', 'from', 'after', 'before']);
const NO_END = new Set(['then', 'for', 'on', 'to', 'the', 'a', 'an', 'of', 'and', 'with', 'at', 'in', 'her', 'his', 'their', 'my', 'our', 'your', 'by', 'from', 'that']);

/**
 * A NEXT STEP IN ABOUT EIGHT WORDS (Hafsah, 25 October: "Next-step lines: about 8 words at most. Shorter, not vaguer: keep names,
 * numbers and days"). A step of nine words or fewer is kept whole. A longer one is cut at its first natural break after the fourth
 * word: a comma, a joining word ("and", "so", "because") or a phrase that only adds detail ("for her final decision on the number"),
 * so the person, the action and its object stay. With no break it keeps its first eight words. It never ends on "for", "the" or "to".
 */
export function inAboutEightWords(step: string): string {
  /* One step, so one sentence: the first. */
  /* A title is not the end of a sentence: "call Mrs. Achola" was cut at "Mrs." and turned round into "Achola. call Mrs." (round 1, 26 October). */
  const parts = (step ?? '').trim().split(/(?<=[a-z0-9)”’])(?<!\b(?:Mr|Mrs|Ms|Dr|Prof|St|Mt|Jr|Sr))\.\s+(?=[A-Z])/);
  /* "Nothing booked." alone says no step: the step said last goes first, with it ("Ask Rose when Mama Mboga Mart will buy. Nothing booked."). */
  if (parts.length > 1 && parts[0].split(/\s+/).length <= 3) {
    const step = inAboutEightWords(parts[parts.length - 1].replace(/\.$/, ''));
    return `${step.replace(/\.$/, '')}. ${parts[0].replace(/\.$/, '')}.`;
  }
  const first = parts.length > 1 ? `${parts[0]}.` : parts[0];
  const words = first.split(/\s+/).filter(Boolean);
  if (words.length <= 9) return first;
  /* What a cut would drop must hold no name, number or day: those stay ("Shorter, not vaguer"). */
  const DAY = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|january|february|march|april|may|june|july|august|september|october|november|december)$/i;
  const holdsAFact = (tail: string[]) => tail.some((w) => /\d/.test(w) || DAY.test(w.replace(/[^A-Za-z]/g, '')) || (/^[A-Z][a-z]/.test(w) && !BREAK_BEFORE.has(w.toLowerCase()) && !PHRASE_BEFORE.has(w.toLowerCase())));
  let cut = -1;
  for (let i = 3; i < Math.min(words.length, 10); i += 1) {
    const w = words[i].toLowerCase().replace(/[^a-z']/g, '');
    const aBreak = (/[,;:]$/.test(words[i - 1]) && i >= 4) || (i >= 4 && BREAK_BEFORE.has(w)) || (i >= 5 && PHRASE_BEFORE.has(w));
    if (aBreak && !holdsAFact(words.slice(i))) { cut = i; break; }
  }
  /* No break drops only detail: a step of fourteen words or fewer stays whole, so a name or a day is never lost; a longer one keeps its first eight. */
  if (cut < 0 && words.length <= 14) return first;
  let out = words.slice(0, cut > 0 ? cut : 8);
  while (out.length > 3 && NO_END.has(out[out.length - 1].toLowerCase().replace(/[^a-z]/g, ''))) out = out.slice(0, -1);
  /* A sentence stays a sentence. */
  return `${out.join(' ').replace(/[,;:.]+$/, '')}${/\.$/.test(first) ? '.' : ''}`;
}
