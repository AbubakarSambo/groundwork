import { createHash } from 'crypto';
import { situationInWords } from './setup-already-asked-this';

/**
 * WHAT AN ACCOUNT SHOWS, NOT WHAT THEY SAID.
 *
 * `GET /grounds/:id/conversation` returned every participant's raw turns to the lead, grouped by
 * party, full content - the one thing the product is sold on never doing. The route is not deleted:
 * a lead legitimately needs to understand what an account tells them. Decided by the product owner,
 * 10-11 September 2026: not a paraphrase either. A paraphrase is their words in other clothes, and
 * it means nothing on its own. What the lead gets is a READ of one account against what the
 * check-in was set up to find out - the brief, the objectives, the situation - saying what that
 * account shows about those questions, where it is silent, and nothing about the person.
 *
 * Three rules, and the structure carries them rather than the prompt alone:
 *   - It is generated once per completed account and kept (the record does not change once the
 *     session is complete), so two readings never disagree.
 *   - It is screened at the read: any sentence that repeats a run of their own words, or quotes
 *     anything, is withheld, and the reader is told a sentence was withheld. Anything derived from
 *     a private record is stripped at the read, never protected by an instruction in a prompt -
 *     this codebase learned that twice.
 *   - It is marked derived wherever it is stored and returned, so no later reader mistakes it for
 *     a quotation and the report builder never treats it as evidence.
 */

export type WhatItAsks = {
  label: string;
  scenario?: string | null;
  brief?: string | null;
  objectives: { name: string; target?: string | number | null }[];
};

/** How many of their words in a row is a lift rather than a coincidence. Same as the report's rule. */
export const A_LIFTED_RUN = 8;

export function theInstruction(asks: WhatItAsks, partyType: string, roleAsDescribed?: string | null): string {
  const objectives = asks.objectives.length
    ? asks.objectives.map((o, i) => `  ${i + 1}. ${o.name}${o.target != null && o.target !== '' ? ` - ${o.target}` : ''}`).join('\n')
    : '  (none stated)';
  return [
    `You are reading ONE person's account from a check-in called "${asks.label}"${situationInWords((asks.scenario ?? null) as any) ? ` (about ${situationInWords((asks.scenario ?? null) as any)})` : ''}.`,
    `The person is ${partyType === 'INITIATOR' ? 'the lead' : 'a participant'}${roleAsDescribed ? `, described as: ${roleAsDescribed}` : ''}.`,
    '',
    'WHAT THE CHECK-IN IS MEANT TO FIND OUT:',
    asks.brief ? `Brief: ${asks.brief}` : 'Brief: (none written)',
    'Objectives:',
    objectives,
    '',
    'Say what this account shows about those questions, for the person who set the check-in up. Plain prose, at most six sentences.',
    'RULES, none of them optional:',
    '- Never quote them. Never reproduce a run of more than five of their words in a row. Say what it shows; do not repeat how they said it.',
    '- Nothing about the person: no judgement, no score, no rating, no comparison to anybody else, no comment on tone or effort.',
    '- Where the account does not speak to a question, say so plainly rather than inferring.',
    '- Use only facts, numbers and names that appear in the account. Invent nothing.',
    '- If the account is too thin to show anything, say that in one sentence and stop.',
  ].join('\n');
}

/** A stable key for "these exact words": a changed transcript is a new read, an unchanged one is the kept read. */
export function sourceHashOf(theirTurns: string[]): string {
  return createHash('sha256').update(theirTurns.join(' ')).digest('hex');
}

/** Straight or curly double quotes, or a curly-quoted span. Word-internal apostrophes are not quotes. */
const looksQuoted = (s: string): boolean => {
  const withoutWordInternal = s.replace(/(\w)['’](\w)/g, '$1$2');
  return /["“”]|['‘][^'’]{2,}['’]/.test(withoutWordInternal);
};

/** Words only, lower-cased: "telling me." and "telling me," are the same eight words. */
const plainWords = (t: string): string => t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

const liftedRunIn = (sentence: string, theirTurns: string[]): string | null => {
  const flat = plainWords(sentence);
  for (const turn of theirTurns) {
    const words = plainWords(turn).split(' ').filter(Boolean);
    for (let i = 0; i + A_LIFTED_RUN <= words.length; i++) {
      const run = words.slice(i, i + A_LIFTED_RUN).join(' ');
      if (run.length > 30 && flat.includes(run)) return run;
    }
  }
  return null;
};

/**
 * The screen at the read. Sentence by sentence: one that quotes anything, or repeats a run of their
 * words, is withheld. What remains is returned with a count of what was withheld, so the reader is
 * told rather than left with a gap that looks like the whole.
 */
export function withoutTheirWords(text: string, theirTurns: string[]): { text: string; withheld: number } {
  const sentences = text.match(/[^.!?]+[.!?]+["”’]?|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
  const kept: string[] = [];
  let withheld = 0;
  for (const s of sentences) {
    if (looksQuoted(s) || liftedRunIn(s, theirTurns)) { withheld += 1; continue; }
    kept.push(s);
  }
  return { text: kept.join(' '), withheld };
}

/** Said beside every read, in the response and in the table, so nobody mistakes it for their words. */
export const A_READ_IS_DERIVED = 'A read of this account against what the check-in asks. Not their words, and not evidence.';
