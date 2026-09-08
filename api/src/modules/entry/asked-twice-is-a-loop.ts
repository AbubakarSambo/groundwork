/**
 * THE SAME QUESTION, THREE TIMES, IN SIX TURNS.
 *
 * Driven live on the new-hire setup. First the question about how long this runs, asked at turn 3,
 * again at turn 4 after an answer that was about something else, and a third time at turn 6 after
 * the person had stopped to ask what it even meant. Then, with that one removed at source, the
 * loop simply moved to the next unanswered question and did the same thing.
 *
 * TWO PASSES OF PROMPT INSTRUCTION DID NOT STOP IT. "Do not ask the same thing twice", then "asked
 * twice and still not answered means take the obvious answer and say so" - both ignored, because a
 * model cannot reliably count its own repetitions across a growing transcript. That is the signal
 * to stop writing rules and compute the fact: whether the last two questions were the same is
 * arithmetic on text we already have.
 *
 * WHAT IT DOES NOT DO. It does not decide the answer, does not skip the question the first time,
 * and does not stop a model asking a genuinely NEW question. It appends one directive to the
 * system prompt for one turn, naming what happened, when the last two asks were the same question
 * wearing different words. Persisting once is right; a third ask reads as not listening.
 */

/** Words that carry no signal about WHICH question is being asked. */
const NOISE = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'do', 'does', 'for', 'from', 'had', 'has',
  'have', 'how', 'i', 'if', 'in', 'is', 'it', 'its', 'just', 'me', 'of', 'on', 'or', 'so', 'that',
  'the', 'their', 'them', 'then', 'there', 'they', 'this', 'to', 'was', 'we', 'what', 'when',
  'where', 'which', 'who', 'will', 'with', 'would', 'you', 'your', 'about', 'want', 'like', 'get',
  'thanks', 'thank', 'okay', 'ok', 'got', 'great', 'perfect', 'sure', 'now', 'also', 'one',
]);

/** The question sentences in a reply - the parts that end in a question mark. */
export function questionsIn(text: string): string[] {
  return (text ?? '')
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().endsWith('?'))
    .map((s) => s.trim());
}

function meaningfulWords(text: string): Set<string> {
  return new Set(
    (text ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !NOISE.has(w)),
  );
}

/**
 * How much two questions overlap, 0 to 1, on the words that carry the question's subject.
 *
 * Jaccard rather than a substring test, because the repeat is never verbatim: "is this a one off,
 * or something you want to come back to" and "is this a one-time check-in, or do you expect it to
 * be a series over her first few weeks" share almost no substring and are plainly the same
 * question.
 */
export function howAlikeTheseQuestionsAre(a: string, b: string): number {
  const wa = meaningfulWords(a);
  const wb = meaningfulWords(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared += 1;
  const union = wa.size + wb.size - shared;
  return union === 0 ? 0 : shared / union;
}

/**
 * MEASURED, NOT GUESSED - AND MEASURED HONESTLY, WHICH MEANT ADMITTING WHAT THIS CANNOT DO.
 *
 * Word overlap catches a repeat that reuses the words. It does NOT catch the pair that started
 * this, because those two share almost no vocabulary at all:
 *
 *   "Is this something you want to come back to as her role develops?"
 *   "Is this a one-off check-in just for her onboarding, or something you plan to use more than
 *    once as she settles in?"
 *
 * Same question, 0.13 similar. So overlap alone would have shipped a guard that passed its tests
 * and missed the case it was written for. What those two DO share is a subject, and the subjects a
 * setup conversation asks about are a short, known list - so the subject is what gets compared,
 * with word overlap kept underneath it for repeats about anything not on the list.
 */
export const SAME_QUESTION_AT = 0.5;

/**
 * The subjects setup asks about, by the words that can only belong to that subject.
 *
 * Deliberately narrow. A phrase appears here only if a question containing it is asking about that
 * subject and nothing else - "start" is not on the WHEN list because "what did you bring them in
 * to do, starting when" is about the role.
 */
const WHAT_A_QUESTION_IS_ABOUT: { subject: string; phrases: string[] }[] = [
  {
    subject: 'how long this runs',
    phrases: [
      'one off', 'one-off', 'one time', 'one-time', 'once', 'recurring', 'regularly', 'come back to',
      'come back round', 'series of', 'ongoing', 'more than once', 'settles in', 'as it goes',
      'over time', 'keep checking',
    ],
  },
  {
    subject: 'what they want out of it',
    /*
     * EVERY PHRASE HERE WAS READ OFF A LIVE RUN, and the list grew twice because the model
     * rephrases rather than repeats: "what do you want to get out of having this written down",
     * then "what is the main reason for getting this on record right now", then "what do you hope
     * having this record will help you achieve", then "what is the most important thing you want
     * to establish". Four askings of one question, no two alike.
     *
     * THE LIMIT OF THIS APPROACH, STATED RATHER THAN HIDDEN: matching phrases cannot recognise a
     * fifth rewording nobody has seen yet. It catches what has actually been observed, and the
     * word-overlap test underneath catches close repeats of anything not listed. A phrasing that
     * escapes both gets asked twice and no more than twice, because the prompt's own rule still
     * applies - this guard exists because that rule alone was not enough, not because it is gone.
     */
    phrases: [
      'get out of', 'want out of', 'written down', 'on record for', 'on record right now',
      'reason for getting', 'hope to', 'hope having', 'achieve', 'what do you want from',
      'why now', 'worth getting', 'want to establish', 'most important thing you want',
    ],
  },
  { subject: 'who else is in it', phrases: ['who else', 'anyone else', 'other people involved', 'who is part of'] },
  { subject: 'their name', phrases: ['their name', 'what is their name', 'name or', 'name is great'] },
  { subject: 'when it starts', phrases: ['when does', 'start date', 'when do they start', 'when is'] },
  { subject: 'what to focus on', phrases: ['focus on', 'anything specific', 'anything particular', 'want the questions'] },
];

export function whatItIsAsking(question: string): string | null {
  const q = (question ?? '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
  for (const { subject, phrases } of WHAT_A_QUESTION_IS_ABOUT) {
    if (phrases.some((phrase) => q.includes(phrase))) return subject;
  }
  return null;
}

/** The same question, either by subject or - for subjects not on the list - by its words. */
export function isTheSameQuestion(a: string, b: string): boolean {
  const sa = whatItIsAsking(a);
  const sb = whatItIsAsking(b);
  if (sa && sb) return sa === sb;
  return howAlikeTheseQuestionsAre(a, b) >= SAME_QUESTION_AT;
}

export function aDirectiveAboutRepeatingYourself(
  messages: { role: string; content: string }[],
): string | null {
  const asked = (messages ?? [])
    .filter((m) => m.role === 'assistant' || m.role === 'ai')
    .map((m) => questionsIn(m.content))
    .filter((qs) => qs.length > 0);
  if (asked.length < 2) return null;

  const last = asked[asked.length - 1];
  const before = asked[asked.length - 2];

  let pair: [string, string] | null = null;
  for (const a of last) {
    for (const b of before) {
      if (isTheSameQuestion(a, b)) {
        pair = [b, a];
        break;
      }
    }
    if (pair) break;
  }
  if (!pair) return null;

  return [
    'YOU HAVE NOW ASKED THE SAME QUESTION TWICE IN A ROW. DO NOT ASK IT A THIRD TIME.',
    '',
    `Asked once: "${pair[0]}"`,
    `Asked again: "${pair[1]}"`,
    '',
    'They have not answered it, and asking again reads as not listening rather than as diligence.',
    'Do this instead, in one or two sentences: take the answer their situation makes obvious, say',
    'what you have taken in half a sentence so they can correct it, and move on to something you',
    'have not asked. If nothing is left to ask, say what you have and finish.',
    'Never repeat the words above. Never rephrase them and ask again.',
  ].join('\n');
}
