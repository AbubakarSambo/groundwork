/**
 * A PROPOSAL HAS TO BE TRACEABLE TO WORDS SOMEBODY ACTUALLY TYPED.
 *
 * Hafsah, 22 September 2026, in the browser. She typed "hi" into the context chat. It answered "What
 * does doing well look like here?" - ignoring her - and then offered, in a card with a Yes button:
 *
 *     I will record that as what doing well looks like: "Hi! What's on your mind?"
 *
 * Its own greeting, from the turn before, about to become the yardstick every report reads her team
 * against. Two faults in one card. The extractor was handed a word with nothing in it and invented a
 * value rather than answering none; and the conversation never acknowledged what she said.
 *
 * THE RULE. Whatever the model reads out of a message, the words have to be in that message. This
 * cannot be asked of a model - it is the model that is wrong when it happens - so it is checked here,
 * in code, against the sentence the person typed. A value that is not traceable is dropped and the
 * conversation carries on asking.
 *
 * IT IS DELIBERATELY CRUDE. Not "is this a good success statement" - that is the lead's judgement -
 * but "did these words come from them". A paraphrase of their own sentence shares its nouns; an
 * invention shares nothing.
 */

import { intoSentences } from '../conversation/nothing-invented-reaches-them';

/** Hello, thanks, ok. A turn with no content to take, which is not a turn to take nothing from. */
const A_GREETING_OR_AN_ACKNOWLEDGEMENT =
  /^(hi|hey|hello|yo|hiya|good (morning|afternoon|evening)|thanks|thank you|thx|ta|ok|okay|cool|great|nice|sure|fine|got it|understood|right|yep|yes|no|nope|sorry|hmm+|erm|um)\b[\s.,!?]*$/i;

/** Whether this message is only a greeting or an acknowledgement, with nothing in it to record. */
export const nothingToTakeFrom = (said: string | null | undefined): boolean => {
  const t = (said ?? '').trim();
  if (!t) return true;
  if (A_GREETING_OR_AN_ACKNOWLEDGEMENT.test(t)) return true;
  /*
   * Three words or fewer with nothing countable in them: "not sure yet", "dunno", "later". A short
   * answer that names a length or a number is an answer - "about three months" is three words and is
   * the whole of what the duration question wanted.
   */
  const countable = /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|twenty|thirty|forty|fifty|sixty|ninety|day|days|week|weeks|month|months|quarter|quarters|year|years|daily|weekly|fortnightly|monthly)\b/i.test(t);
  return t.split(/\s+/).length <= 3 && !countable;
};

const FILLER = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'about', 'what', 'when', 'will', 'would',
  'should', 'could', 'have', 'has', 'are', 'was', 'were', 'our', 'your', 'their', 'they', 'them',
  'you', 'i', 'we', 'it', 'is', 'be', 'been', 'being', 'a', 'an', 'to', 'of', 'in', 'on', 'at',
  'by', 'as', 'if', 'or', 'but', 'not', 'no', 'yes', 'do', 'does', 'did', 'like', 'looks', 'look',
]);

const contentWords = (text: string): string[] =>
  (text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !FILLER.has(w) && (/\d/.test(w) || w.length > 2))
    .map((w) => (w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));

/**
 * Whether a value the model read out of a message is traceable to that message.
 *
 * Most of the value's own words have to be in what they said. A model that tidies grammar keeps the
 * nouns; a model that invents keeps nothing. Where they typed nothing with content in it, nothing is
 * traceable - which is the "hi" case that started this.
 */
export function traceableToWhatTheySaid(value: string | null | undefined, said: string | null | undefined): boolean {
  const mine = contentWords(value ?? '');
  if (!mine.length) return false;
  const theirs = new Set(contentWords(said ?? ''));
  if (!theirs.size) return false;
  const shared = mine.filter((w) => theirs.has(w)).length;
  /* Most of it, not some of it: a one-word overlap is how "Hi! What's on your mind?" would pass. */
  return shared >= Math.ceil(mine.length * 0.6);
}

/**
 * A SENTENCE THAT PROMISES TO RECORD SOMETHING IS DROPPED WHEN NOTHING IS BEING PROPOSED. FIX 4.
 *
 * Driven live: after "Ben should be more proactive", the chat said "I will record this as your read
 * of Ben... it will never be quoted to Ben" - and nothing was recorded, because that answer was not
 * specific enough to hold anybody to and fell to `{kind: 'none'}`. A sentence that says something
 * will be kept, with nothing behind it in the same turn to actually keep, is a false statement -
 * exactly the shape `traceableToWhatTheySaid` exists for, one turn later: it is not enough for the
 * words to be theirs, the ACT has to be real too.
 *
 * A `lead_read` or `expectation` proposal attached to the same turn makes the promise true, so this
 * only drops the sentence when `hasProposal` is false - the coaching rule (rule 2 of
 * `contextChatPrompt`) is free to say it plainly whenever there is something to say yes to.
 */
/*
 * FOUND LIVE, 30 September 2026: the first version only caught the future tense, "I will record...".
 * The real model said it two OTHER ways on the same live run, neither of which this caught:
 *   old route:      "I HAVE recorded that as your read of Ben." (past tense, as though already done)
 *   Ask Groundwork: "I'M RECORDING that you see Ben as struggling..." (present continuous)
 * Both are the same false promise in a different tense, so all three are covered now.
 */
const PROMISES_TO_RECORD =
  /\b(i(?:'m| am)\s+(?:recording|keeping|saving|noting|logging)\b|i\s+(?:will|have|'ve|'ll)\s+(?:record(?:ed)?|keep(?:ing)?|kept|save(?:d)?|note(?:d)?|log(?:ged)?|write (?:that|this|it) down)\b|(?:will be|has been|have been|is being) (?:recorded|kept|saved|noted|logged)\b|recording (?:that|this|it) as|keeping (?:that|this|it) as)/i;

export function dropsAPromiseWithNothingToKeep(text: string, hasProposal: boolean): string {
  if (hasProposal) return text;
  const kept = intoSentences(text).filter((s) => !PROMISES_TO_RECORD.test(s));
  return kept.join('').trim();
}

/** A number a person typed, in any of the ways they write it: 90, ninety, 12 weeks, 3 months. */
const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, sixty: 60, ninety: 90,
};

/**
 * Whether a length in days could have come from what they typed.
 *
 * Deliberately generous about the unit, because a person says "three months" and the field holds 90:
 * any number in their sentence, read as days, weeks, months or quarters, that lands within a day of
 * the value counts. What it refuses is a length with no number behind it at all.
 */
export function aLengthTheyCouldHaveMeant(days: number | null | undefined, said: string | null | undefined): boolean {
  if (days == null || !Number.isFinite(days)) return false;
  const text = (said ?? '').toLowerCase();
  /* A date they named - "until the end of December" - is a length nobody should have to arithmetic in
     their head, and it is checked before any number, because most of those sentences have none. */
  if (/\b(until|till|through|by the end of|end of|by \d)\b/.test(text)) return true;
  const numbers: number[] = [...text.matchAll(/\d+/g)].map((m) => Number(m[0]));
  for (const [word, n] of Object.entries(NUMBER_WORDS)) if (new RegExp(`\\b${word}\\b`).test(text)) numbers.push(n);
  if (!numbers.length) return false;
  return numbers.some((n) => [n, n * 7, n * 14, n * 30, n * 31, n * 90, n * 365].some((cand) => Math.abs(cand - days) <= 1));
}
