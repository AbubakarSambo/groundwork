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
import { aNameSaidAgainInOneSentence } from './a-name-said-twice-in-a-row';

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
  /* A question that says a call "has been open a while" on a check-in answered once, joined by a dash (requests 135, 136). */
  [/That call has been open a while\s*(?:[-\u2013\u2014]|\.)\s*what is the decision, and when\?/gi, 'What is the decision, and when will it be made?'],
  /* The reader named twice in one list of people (request 135 item 5): "You and You are waiting for the signed witness statement". */
  [/\bYou and (?:You|you)\b/g, 'You'],
  [/\byou and (?:You|you)\b/g, 'you'],
  /* Under "Worth asking", advice not to ask (requests 130 e and 134 item 3). */
  [/This early, that is worth showing you rather than asking about\./g, 'It is early. What is being held up, and would help raising it be useful?'],
  [/This early, that is worth showing ([^.]+?) rather than asking about\./g, 'It is early, so ask $1 what is being held up and whether help raising it would be useful.'],
  /* A colon joining two pieces (request 131 item 3). */
  [/(Updated after somebody added to or corrected their own check-in\.) What changed: ([^.]*?(?:,| and )[^.]*)\./g, '$1 The parts that changed were $2.'],
  [/(Updated after somebody added to or corrected their own check-in\.) What changed: ([^.]+)\./g, '$1 The part that changed was $2.'],
  /* Several things, but "it" (request 132 g). */
  [/(\d+ things are waiting on somebody outside this check-in, and nothing on record says anybody has chased) it\. Ask what has been tried beyond writing to them\./g, '$1 them. Ask what has been tried beyond writing to those people.'],
  [/(\d+ things are waiting on somebody in this check-in, and nothing on record says anybody has gone back about) it\. Ask whether it was raised/g, '$1 them. Ask whether they were raised'],
  [/Escalated it\./g, 'It was taken above the person it was with.'],
];

/**
 * A SENTENCE THAT IS ABOUT THE READER SAYS "YOU" THROUGHOUT (requests 129 item 3, 131 item 1, 132 e). The writer began
 * "Your goal is not being met, and their own open task is part of the problem." and "You have not yet made the visit
 * to Kisumu they said they would." A sentence that begins with "You" or "Your" is about the reader, so the "their own"
 * and "they said they would" inside it are the reader's too. Only those two phrasings are changed, and only in a
 * sentence that names nobody else before them.
 */
function aSentenceAboutTheReaderSaysYou(text: string): string {
  /* The spaces and new lines between sentences are kept as they are: the pieces are the even places, the gaps the odd. */
  return text.split(/(?<=[.!?])(\s+)/).map((sentence, at) => {
    if (at % 2 === 1) return sentence;
    if (!/^You\b/.test(sentence) && !/^Your\b/.test(sentence)) return sentence;
    const beforeThem = sentence.split(/\bthey\b|\btheir\b/i)[0];
    if (/\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(beforeThem.replace(/^You(?:r)?\s/, ''))) return sentence;
    return sentence
      .replace(/\bthey said they would\b/g, 'you said you would')
      .replace(/\band their own\b/g, 'and your own');
  }).join('');
}

/*
 * NO PRONOUN OR REFLEXIVE IN THE LEAD'S JUDGEMENT IS REWRITTEN HERE (request 123 item 7, after three reviews).
 *
 * Three rules were tried and each was taken out, because each could put a false sentence about the lead on the page:
 * "she" and "he" ("Your own answers show she was late" became "you were late"), "they" after the reader's own record
 * ("... says they were late on three deliveries"), and a reflexive ("You saw the drivers load the vans themselves"
 * became "yourself"). Who a pronoun means is the writer's to say, so it goes to the judgement's prompt. What stays at
 * the read is the verb after "until you ... and" (party-labels.ts), which names nobody.
 */

export function oldWordingPutPlain(text: string): string {
  let out = text;
  for (const [pattern, to] of OLD_WORDING) out = out.replace(pattern, to as any);
  return aSentenceAboutTheReaderSaysYou(out);
}

/**
 * A WAIT WITH ITS HOLDER AND ITS THING AS ONE (requests 127 and 134). "waiting on the tax view for "the tax view"" and
 * "waiting on the pipeline for a fix for the pipeline" say one thing twice. The holder is dropped: "waiting for the tax
 * view", "waiting for a fix for the pipeline". Done before the quotation marks are set aside, because the thing is quoted.
 */
const A_HOLDER_THAT_IS_THE_THING = /\bwaiting on ((?:the|a|an) [^.,;"\u201c\u201d]{2,60}?) for (?:"|\u201c)?(\1)(?:"|\u201d)?(?=[\s.,;]|$)/gi;
const A_HOLDER_INSIDE_THE_THING = /\bwaiting on (the [a-z][a-z-]*(?: [a-z][a-z-]*)?) for ((?:a|an|the) [^.,;"\u201c\u201d]*?\b\1\b[^.,;"\u201c\u201d]*?)(?=[.,;]| since\b|$)/gi;
export function aWaitSaidOnce(text: string): string {
  return text.replace(A_HOLDER_THAT_IS_THE_THING, 'waiting for $1').replace(A_HOLDER_INSIDE_THE_THING, 'waiting for $2');
}

/** Both repairs, on everything outside the quotation marks. */
/**
 * A NUMBER IS NOT TWO SENTENCES (run 32, the advisor report).
 *
 * The model wrote "receiving 0. 5% for two years" - a space inside a decimal - and every sentence
 * splitter in the product then did the only thing it could with it. The lead and the participant
 * each read two broken lines: "...is 'receiving 0." and "5% for two years'.", the second starting
 * lower case because it is the middle of a number.
 *
 * ONLY WHERE A PER CENT SIGN FOLLOWS, and my first attempt was wider than that. I wrote it as
 * "a digit, a full stop, a space, a digit", and my own test caught it joining "The target is 40.
 * 12 shops have ordered." into "40.12 shops" - a sentence can end in a number and the next can
 * begin with one. There is no way to tell those apart from the digits alone.
 *
 * "0. 5%" has one: the digits after the space are followed immediately by a per cent sign, and no
 * sentence begins "5% ..." after one ending in a bare number. Narrow and always right, which is
 * worth more than wide and usually right.
 *
 * Repaired here rather than in twenty splitters, and before them, so it holds everywhere at once.
 */
const aNumberIsNotTwoSentences = (t: string) => t.replace(/(\d)\.\s+(\d+%)/g, '$1.$2');

/*
 * A TITLE IS NOT THE END OF A SENTENCE EITHER, AND I TOOK THAT FIX BACK OUT. Run 32 showed
 * "Ngozi Eze is waiting on Mr." - cut off, because the stop after a title is a stop to a
 * splitter. I dropped the stop, which is British style and would have stopped any splitter
 * breaking there, and three board tests went red: they pin "Ngozi Eze is waiting on Mr. Adebayo
 * for a date for the credit decision", which is correct English. The fix changed three correct
 * sentences to repair one broken one, so it is not a fix.
 *
 * It belongs where the splitting happens, or in the per-reader check of task 1.6 which sees the
 * rendered line. Not here, where it rewrites text that is already right.
 */

/*
 * MORE THAN THE TARGET IS NEVER "49 OF YOUR 30" (night run 2, 20 October). Kevin's own report said "Roysambu Gym is your third sale, 49 of
 * your 30 units." The record holds 49 units sold against his target of 30, so "49 of your 30" says something that cannot be. Only where the
 * first number is the larger: "49 units, 19 more than your 30". A count within the target is left exactly as it was written.
 */
export function moreThanTheTargetSaidSo(text: string): string {
  return text.replace(/\b(\d[\d,]*) of your (\d[\d,]*)(?: ([a-z]+))?\b/g, (m, a: string, b: string, word?: string) => {
    const n = Number(a.replace(/,/g, ''));
    const t = Number(b.replace(/,/g, ''));
    if (!(t > 0 && n > t)) return m;
    return `${a}${word ? ` ${word}` : ''}, ${(n - t).toLocaleString('en-US')} more than your ${b}`;
  });
}

export function aStoredSentenceReadsRight(text: string, names?: readonly string[]): string {
  if (!text || typeof text !== 'string') return text;
  return theQuotesKept(aWaitSaidOnce(text), (outside) => {
    /* Inside the callback, so it never touches what somebody actually said (Hafsah, 26 September:
       people's own words stay exactly as they said them). My first version ran it over the whole
       string, quotations included, which that decision forbids. */
    outside = moreThanTheTargetSaidSo(aNumberIsNotTwoSentences(outside));
    const plain = aLabelEndsWithoutAFullStop(oldWordingPutPlain(outside));
    /* A name is not said again in the sentence about that person (requests 129, 133, 135): "Amani Wekesa says Amani paid ...". */
    return names?.length ? aNameSaidAgainInOneSentence(plain, names) : plain;
  });
}

/* Fields that carry a person's own words, which no repair touches. */
const THEIR_OWN_WORDS = new Set(['theirWords', 'said', 'quote', 'quotes', 'theySaid']);

/**
 * The same repair over a whole served payload (the board's), for the sentences the board composes after the
 * names are put in. Plain objects and lists are walked; dates and other instances are sent as they are.
 */
export function everyStoredSentenceReadsRight<T>(payload: T, names?: readonly string[]): T {
  const walk = (v: any): any => {
    if (typeof v === 'string') return aStoredSentenceReadsRight(v, names);
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
