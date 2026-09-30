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
 * FOUND LIVE AGAIN, 30 September 2026, on the four live checks: this used to only drop the sentence
 * when `hasProposal` was false, on the reasoning that a proposal attached to the same turn makes the
 * promise true. That reasoning was wrong. `proposal.say` is the one statement of what will be kept -
 * built deterministically, in code, from the same words the lead typed (see `proposalFrom` and
 * `verbatimQuote`) - and it is shown to the lead separately, with its own Yes. The model's OWN
 * sentence restating the same thing is a second, independent description of it, free to disagree
 * with the real one:
 *
 *   "I can add that you expect Ben to be more proactive." - beside an offer to keep "should be more
 *     proactive" as a PRIVATE NOTE, not an expectation
 *   "I can add that Ben expects to close three renewals by the end of December." - beside the correct
 *     say-back, but naming the wrong person and a different number form
 *
 * Both were true statements in the narrow sense that something real was being recorded that turn - so
 * the old `hasProposal` guard let them straight through - and both were wrong about what. The model's
 * restating sentences are dropped now whenever a proposal is attached, exactly as a false promise is
 * dropped when one is not: either way, `proposal.say` is the only sentence allowed to describe what
 * gets kept. The model's own QUESTION survives untouched, because nothing here matches one - "Should
 * I record that as well?" has no modal directly after "I", only "record" does, and the pattern below
 * requires the modal.
 */
/*
 * FOUND LIVE, 30 September 2026: the first version only caught the future tense, "I will record...".
 * The real model said it two OTHER ways on the same live run, neither of which this caught:
 *   old route:      "I HAVE recorded that as your read of Ben." (past tense, as though already done)
 *   Ask Groundwork: "I'M RECORDING that you see Ben as struggling..." (present continuous)
 * Both are the same false promise in a different tense, so all three are covered now.
 *
 * FOUND LIVE AGAIN, 30 September 2026, on the four live checks: a fourth phrasing slipped through both
 * doors, with no proposal attached that turn -
 *   "I'll record what you tell me as your perspective on Ben, and it will guide how we run this
 *   check-in."
 * "I'll" is a contraction of "I will" with no space before the apostrophe, so the old "i\s+(?:...|'ll)"
 * branch never matched it - it only matched "I" then whitespace then "'ll", which never occurs. The
 * subject-and-modal is now its own piece, covering every contraction ("I'll", "I'm", "I've", "we'll")
 * and "going to" as well as "will/am/have", bridged to the verb by an optional "be". A second branch
 * catches "record/note/keep ... as your perspective/read/expectation" in any tense, with no subject
 * required, since the model does not always say "I" right next to the verb.
 */
/*
 * "can" joins the other modals so "I can add that ..." is caught, and "add(?:ing)?" joins the record
 * verbs so both real examples above ("I can add that you expect...") match through the same piece
 * that already caught "I will record...", "I've noted...", and so on - it is the same sentence shape
 * either way, so one piece of grammar covers it rather than a second copy of it.
 */
const SUBJECT_AND_MODAL = "(?:i|we)(?:'ll|'m|'ve|\\s+will|\\s+am|\\s+have|\\s+are|\\s+can)";
const RECORD_VERB = '(?:record(?:ing|ed)?|mark(?:ing|ed)?|keep(?:ing)?|kept|sav(?:e|ing|ed)|not(?:e|ing|ed)|log(?:ging|ged)|add(?:s|ed|ing)?|write (?:that|this|it) down)';
/*
 * FOUND LIVE AGAIN, 30 September 2026, on the four live checks: a fifth phrasing slipped through
 * every door above, with a proposal attached that turn -
 *   "I have ALSO recorded that you want the pipeline update by every Friday."
 * one adverb sitting between the modal and the verb was enough to break the old
 * `SUBJECT_AND_MODAL ... RECORD_VERB` match, which only allowed "going to" and "be" in that gap. The
 * same run also had a second, subjectless false promise right after it -
 *   "This will be marked as your expectation for him..."
 * - "marked" was not in the passive-verb list at all, so it slipped through untouched even though the
 * exact shape ("will be X as your expectation") is the one this file exists to catch. Both sentences
 * describe what proposal.say already says, or say something that never happened - either way they are
 * dropped, same as every phrasing above them.
 */
const RECORDING_ADVERB = '(?:also|already|now|just|gone ahead and)';
const PROMISES_TO_RECORD = new RegExp(
  `\\b${SUBJECT_AND_MODAL}\\b\\s*(?:going to\\s+)?(?:be\\s+)?(?:${RECORDING_ADVERB}\\s+){0,2}${RECORD_VERB}` +
    '|\\b(?:record|records|recording|recorded|mark|marks|marking|marked|note|notes|noting|noted|keep|keeps|keeping|kept)\\b(?:(?!\\.).){0,80}\\bas your (?:perspective|read|expectation|note)\\b' +
    '|(?:will be|has been|have been|is being) (?:recorded|marked|kept|saved|noted|logged)\\b' +
    /* REQUEST 92, POINT 7: "... is added as what doing well looks like", said before any yes. */
    '|\\b(?:is|are|was|were)\\s+(?:now\\s+|also\\s+|already\\s+)?(?:added|recorded|saved|stored|logged)\\b' +
    '|recording (?:that|this|it) as|keeping (?:that|this|it) as',
  'i',
);

/**
 * A SENTENCE STARTING "IT", "THIS" OR "THAT" HAS NOTHING TO POINT AT ONCE WHAT IT CONTINUES IS GONE.
 * FIX (found live, the four live checks, 30 September 2026).
 *
 * Driven live, no proposal attached that turn: "I will keep that as a private note about Ben. It will
 * guide how this check-in is run and how I talk to you about it. It is not quoted to Ben Okafor as a
 * finding." The first sentence matched `PROMISES_TO_RECORD` and was dropped; neither "It..." sentence
 * did, because neither one itself promises to record anything - so both survived, orphaned, pointing
 * at a sentence the lead never saw. A pronoun opening a sentence that used to follow a dropped one is
 * not a sentence with its own meaning; it is the second half of one, with the first half removed.
 */
const OPENS_WITH_A_DANGLING_PRONOUN = /^\s*(?:it|this|that)\b/i;

/**
 * `hasProposal` is unused now: the sentence is dropped either way, for two different reasons - see
 * the comment above. The parameter stays so every call site keeps saying, in its own words, whether a
 * proposal is attached this turn, which is worth reading at the call site even though both branches
 * now do the same thing.
 */
export function dropsAPromiseWithNothingToKeep(text: string, hasProposal: boolean): string {
  void hasProposal;
  const sentences = intoSentences(text);
  const kept = sentences.map((s) => !PROMISES_TO_RECORD.test(s));
  /* Cascades: a second orphan can follow the first one that this pass just dropped. */
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 1; i < sentences.length; i++) {
      if (kept[i] && !kept[i - 1] && OPENS_WITH_A_DANGLING_PRONOUN.test(sentences[i])) {
        kept[i] = false;
        changed = true;
      }
    }
  }
  return sentences.filter((_, i) => kept[i]).join('').trim();
}

/**
 * THE PRODUCT'S WORD FOR A CHECK-IN IS "CHECK-IN". A sentence of the model's that still carries the
 * bare word "ground" after the vocabulary pass (`forHumans` only converts it where a determiner
 * governs it) is dropped rather than patched, because a person must never read it (request 92,
 * point 7). Only the model's own text goes through this; a sentence the product writes never has it.
 * "Groundwork" is a different word and is left alone.
 */
export function withoutTheWordGround(text: string): string {
  return intoSentences(text).filter((s) => !/\bgrounds?\b/i.test(s)).join('').trim();
}

/** Whether a sentence, once its trailing whitespace is ignored, is a question. */
const endsInAQuestion = (s: string): boolean => /\?\s*$/.test(s.trimEnd());

/**
 * A sentence CLAIMING something is being recorded, kept, noted, added, marked, described or saved -
 * broader than `PROMISES_TO_RECORD`, which only exists to catch a FALSE promise on a turn with
 * nothing behind it. This is used the other way round, on a turn that DOES have something behind it:
 * any sentence making that claim, in whatever words, is the model's own second description of what
 * `proposal.say` already states once, deterministically - never the one the lead should read twice,
 * and never trustworthy as a stand-in acknowledgement before the model's question.
 */
const CLAIMS_TO_RECORD_KEEP_OR_DESCRIBE =
  /\b(record\w*|keeps?|keeping|kept|notes?|noting|noted|adds?|adding|added|marks?|marking|marked|describ\w*|description|saves?|saving|saved)\b/i;

/** Short enough to be a plain acknowledgement, not a sentence carrying its own claim. */
const SHORT_ACKNOWLEDGEMENT_MAX_WORDS = 12;

/**
 * WHAT THE LEAD READS FROM THE MODEL'S OWN REPLY, STRUCTURALLY RATHER THAN BY PATTERN. FIX (found
 * live again, the four live checks, 30 September 2026, on the real model).
 *
 * `dropsAPromiseWithNothingToKeep` above is a list of the phrasings caught so far, and every live run
 * has found one more: "I'll make a note of that: ..." (no modal-then-verb the regex requires), "It
 * will guide how this check-in is run..." (nothing here promises to record anything, it is a second
 * sentence with the first one removed), "'Good means ...' is now the description of success for this
 * check-in." (no promise verb at all, a false claim in the present tense that something already
 * happened). Each was a new way of saying the same two things this function exists to stop: restating
 * what `proposal.say` already states once, or claiming a fact about the record before the lead has
 * said yes to it. Regexing the next phrasing is not a fix, it is a queue.
 *
 * THE STRUCTURAL RULE, RULE 1: when a proposal is attached to this turn, `proposal.say` - built
 * deterministically from the lead's own words, in `proposalFrom` or `restatesSuccess` - is the one
 * statement of what will be kept. It is shown separately, with its own Yes. Whatever the MODEL wrote
 * this turn is read for one thing only: the question it is asking next. Every sentence that ends in
 * "?" is kept; at most one short sentence immediately before the first of them is kept alongside it,
 * as a plain acknowledgement, and only if it makes no claim about recording, keeping, noting, adding,
 * marking, describing or saving anything, and does not open with a pronoun that would refer back to a
 * sentence already dropped. Every other sentence is dropped. If the model asked no question at all,
 * nothing here is worth reading twice on top of `proposal.say`, and this returns empty.
 *
 * With no proposal attached, this defers to `dropsAPromiseWithNothingToKeep`, unchanged: there is no
 * `proposal.say` standing beside it in that case, so the model's own sentences are what the lead has,
 * and only a false promise or a sentence orphaned by dropping one is removed from them.
 */
export function whatTheModelsReplyShows(text: string, hasProposal: boolean): string {
  if (!hasProposal) return dropsAPromiseWithNothingToKeep(text, false);
  const sentences = intoSentences(text);
  const isQuestion = sentences.map(endsInAQuestion);
  const firstQuestion = isQuestion.indexOf(true);
  /* No question anywhere: proposal.say is the whole of what is shown, and nothing here is added. */
  if (firstQuestion === -1) return '';
  const keep = isQuestion.slice();
  if (firstQuestion > 0) {
    const ack = sentences[firstQuestion - 1];
    const words = ack.trim().split(/\s+/).filter(Boolean).length;
    const isShort = words > 0 && words <= SHORT_ACKNOWLEDGEMENT_MAX_WORDS;
    const claims = CLAIMS_TO_RECORD_KEEP_OR_DESCRIBE.test(ack);
    const dangling = OPENS_WITH_A_DANGLING_PRONOUN.test(ack);
    if (isShort && !claims && !dangling) keep[firstQuestion - 1] = true;
  }
  return sentences.filter((_, i) => keep[i]).join('').trim();
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

/**
 * WHETHER THEY SAID IT RUNS UNTIL THEY END IT (request 37).
 *
 * "When I end it", "until I stop it", "no end date", "keep going until I say" and "ongoing" are all an
 * answer to how long it runs. Read in code from the lead's own sentence, so that the answer is taken
 * even when the model read it as no length at all.
 */
export function saidUntilIEndIt(said: string | null | undefined, whileLengthIsTheQuestion = false): boolean {
  const text = (said ?? '').toLowerCase().replace(/[’]/g, "'");
  if (!text) return false;
  /* Plain forms, read whatever question is open. */
  if (/\b(until|till) (i|we) (end|stop|close|finish|call)\b/.test(text)
    || /\bwhen (i|we) (end|stop|close|finish|call) (it|this)\b/.test(text)
    || /\b(keep|keeps) (it )?(going|running) until\b/.test(text)) return true;
  /* Looser words ("ongoing") are read only as the answer to how long it runs, so a sentence about
     "ongoing support" is never taken as a length. */
  return whileLengthIsTheQuestion
    && (/\b(no|without an?) (set |fixed |planned )?(end|end date|length|finish)\b/.test(text)
      || /\b(ongoing|open[- ]ended|indefinitely|forever)\b/.test(text));
}

/**
 * A LENGTH ANSWER IS ONLY EVER READ AS A LENGTH (request 92, point 10).
 *
 * "It should run for 13 weeks." was recorded as what doing well looks like, because the question on
 * the table was about that, the sentence shares its words with nothing else, and the words were the
 * lead's own. Which question is open decides what a sentence MAY answer; it must not decide what a
 * sentence that is only a length becomes. Returns the days when the message says a length and nothing
 * else of substance, and null otherwise, so "13 weeks, and doing well means every shop pays" is still
 * read for what else it says.
 */
const UNIT_DAYS: Record<string, number> = { day: 1, week: 7, month: 30, quarter: 90, year: 365 };
const A_LENGTH = /\b(\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|twenty|thirty|forty|fifty|sixty|ninety)\s*(?:-\s*)?(day|week|month|quarter|year)s?\b/i;
const LENGTH_FILLER = new Set([
  'it', 'its', 'should', 'would', 'could', 'can', 'will', 'shall', 'lets', 'let', 'make', 'have', 'run', 'running', 'runs', 'last', 'lasts',
  'go', 'goes', 'take', 'takes', 'be', 'for', 'about', 'around', 'roughly', 'approximately', 'just', 'only', 'maybe', 'say', 'the', 'this',
  'that', 'checkin', 'check', 'in', 'long', 'over', 'of', 'a', 'an', 'to', 'we', 'i', 'think', 'want', 'like', 'set', 'us', 'is', 'ok',
  'okay', 'please', 'then', 'so', 'yes', 'and', 'or', 'up', 'at', 'least', 'most', 'more', 'less', 'than', 'whole', 'full', 'length', 'time',
  'duration', 'period', 'how', 'our', 'my', 'sounds', 'good', 'fine', 'perfect', 'right', 'says', 'said', 'needs', 'need', 'get', 'there', 'one',
]);
const NUMBER_TO_DAYS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, ninety: 90 };

export function aLengthAndNothingElse(said: string | null | undefined): number | null {
  const text = (said ?? '').trim();
  if (!text || text.length > 120) return null;
  const m = A_LENGTH.exec(text);
  if (!m) return null;
  const n = /^\d/.test(m[1]) ? Number(m[1]) : NUMBER_TO_DAYS[m[1].toLowerCase()];
  if (!Number.isFinite(n) || n <= 0) return null;
  const rest = (text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length))
    .toLowerCase().replace(/[^a-z\s']/g, ' ').replace(/'/g, '').split(/\s+/).filter(Boolean);
  if (rest.some((w) => !LENGTH_FILLER.has(w))) return null;
  return Math.round(n * UNIT_DAYS[m[2].toLowerCase()]);
}
