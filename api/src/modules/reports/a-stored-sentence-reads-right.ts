/**
 * A SENTENCE THAT WAS STORED BEFORE THE WORDING RULES READS RIGHT WHEN IT IS SERVED (decision 91, item 2).
 *
 * The existing-clients comparison found two faults in what is served from rows that were written earlier, and
 * the rows cannot be rewritten (a stored report is never rebuilt by opening it). So they are put right where
 * the text is served.
 *
 *  1. A person's label that ends in a full stop. A role written as "Support manager." was used as the label,
 *     so the sentence read "Support manager. is waiting on the team responsible for the fix". A full stop that
 *     is followed by a word in lower case, or by a comma, is the end of a label and not the end of a sentence,
 *     so it is taken out: "Support manager is waiting on the team responsible for the fix".
 *  2. The engine's own old wording, which used work words ("escalating", "escalation", "Escalated it"). The
 *     code that writes these sentences now says what happened in plain words (see what-the-record-shows-over-time
 *     and what-to-probe); this puts the same words on the rows written before that change.
 *
 * Words inside quotation marks are a person's own and are never touched (see a-quote-is-what-they-said).
 */
import { theQuotesKept } from './a-quote-is-what-they-said';

/* A word that, after a full stop, means the full stop was a label's and not a sentence's. */
const CONTINUES = 'is|are|was|were|be|been|has|have|had|will|would|can|could|should|may|might|must|does|did|owes|owe|believes|committed|said|says|wants|needs|works|waits|for|on|to|about|from|with|in|at|by|of|and|or|but|because|which|that';
const A_LABEL_ENDS_ITS_FULL_STOP = new RegExp(`\\b([A-Za-z][A-Za-z-]*)\\.(?=,| (?:${CONTINUES})\\b)`, 'g');
/* Real abbreviations, which keep their full stop. */
const ABBREVIATIONS = new Set(['vs', 'etc', 'e.g', 'i.e', 'no', 'approx', 'inc', 'ltd', 'co', 'mr', 'mrs', 'ms', 'dr', 'st', 'jr', 'sr']);

export function aLabelEndsWithoutAFullStop(text: string): string {
  return text.replace(A_LABEL_ENDS_ITS_FULL_STOP, (m, word: string, offset: number, whole: string) => {
    if (ABBREVIATIONS.has(word.toLowerCase())) return m;
    /* A capital after a lower-case lead-in ("Whether The three partnerships ... began.") is a quotation that lost its marks, not a
       label: it is left for the check that reads every line before it is kept (every-line-is-read-before-it-is-kept). */
    const sentence = whole.slice(Math.max(whole.lastIndexOf('. ', offset) + 2, 0), offset);
    if (/[a-z] (?:The|A|An|This|These|Those|It|They|We|I)\b/.test(sentence)) return m;
    return word;
  });
}

const THAT_NOBODY_CHASED = 'Nothing on record says anybody has chased it since';

/** The old wording of a wait, as it was stored, put as the code now writes it. */
const OLD_WORDING: Array<[RegExp, string | ((...m: string[]) => string)]> = [
  /* "...for "x"; 2 sessions; nothing on record about escalating it; this is work A owes B, not the other way round." */
  [/;\s*(\d+) (session|sessions);\s*nothing on record about escalating it/gi, (_m, n, s) => `. It has been waiting for ${n} ${s}. ${THAT_NOBODY_CHASED}`],
  [/;\s*nothing on record about escalating it/gi, `. ${THAT_NOBODY_CHASED}`],
  [/\bnothing on record about escalating it/gi, THAT_NOBODY_CHASED.toLowerCase()],
  [/;\s*this is work\b/g, '. This is work'],
  [/, unescalated\b/gi, ', and nothing on record says anybody has chased it'],
  /* What a person tried about a wait, as what-to-probe wrote it. */
  [/Asked, and the record shows no escalation\./g, 'It was asked for, and nothing on record shows it was taken any further.'],
  [/Escalated (\d+) of (\d+)\. The (other was|others were) asked for and not escalated\./g, (_m, a, b, were) => `${a} of ${b} ${a === '1' ? 'was' : 'were'} taken above the person ${a === '1' ? 'it was' : 'they were'} with. The ${were} asked for, and nothing more is on record.`],
  [/Escalated all (\d+)\./g, (_m, n) => `All ${n} were taken above the person they were with.`],
  [/Escalated it\./g, 'It was taken above the person it was with.'],
];

export function oldWordingPutPlain(text: string): string {
  let out = text;
  for (const [pattern, to] of OLD_WORDING) out = out.replace(pattern, to as any);
  return out;
}

/** Both repairs, on everything outside the quotation marks. */
export function aStoredSentenceReadsRight(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return theQuotesKept(text, (outside) => aLabelEndsWithoutAFullStop(oldWordingPutPlain(outside)));
}

/* Fields that carry a person's own words, which no repair touches. */
const THEIR_OWN_WORDS = new Set(['theirWords', 'said', 'quote', 'quotes', 'theySaid']);

/**
 * The same repair over a whole served payload (the board's), for the sentences the board composes after the
 * names are put in. Plain objects and lists are walked; dates and other instances are sent as they are.
 */
export function everyStoredSentenceReadsRight<T>(payload: T): T {
  const walk = (v: any): any => {
    if (typeof v === 'string') return aStoredSentenceReadsRight(v);
    if (Array.isArray(v)) return v.map(walk);
    if (!v || typeof v !== 'object') return v;
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null) return v;
    const out: Record<string, any> = {};
    for (const [k, x] of Object.entries(v)) out[k] = THEIR_OWN_WORDS.has(k) ? x : walk(x);
    return out;
  };
  return walk(payload);
}
