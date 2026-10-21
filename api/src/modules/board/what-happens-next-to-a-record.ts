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
  const promise = name.length >= 3 ? openPromises.find((c) => ` ${squash(c.text)} `.includes(` ${name} `) || (!!c.about && squash(c.about) === name)) : undefined;
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

/** "send the quote, with a photo" as the column reads it: "Send the quote, with a photo". */
export function aStepOnItsOwn(step: string): string {
  const t = step.trim().replace(/[.\s]+$/, '');
  return t ? `${t.charAt(0).toUpperCase()}${t.slice(1)}` : t;
}
