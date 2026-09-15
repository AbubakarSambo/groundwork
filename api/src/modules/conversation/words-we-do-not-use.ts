/**
 * THE BANS THE PROMPT ASKED FOR POLITELY, 8,317 TIMES, AND GOT 237 TIMES.
 *
 * The system prompt bans a list of words and phrases outright. Every AI turn the product has ever
 * produced is on record, so this was countable rather than arguable: 237 of 8,317 turns carried
 * something the prompt bans. "It sounds like" alone appears 125 times. The rate holds to the
 * current day, including a check-in driven this afternoon.
 *
 * A literal string is a SHAPE. Nothing about "never write the phrase 'it sounds like'" needs
 * judgement, and a prompt asking for it leaks about one turn in fifty for the life of the product.
 * Same shape as every other guard here: spot it, name the fault, ask once more, keep the second
 * only if it is genuinely clean.
 *
 * THE LIST WAS ALSO STATED TWICE AND HAD DRIFTED. Lines 489 and 1274 of the prompt row both carry
 * it; "entry" is in one copy and "employee" and "staff" are in the other. This is the one list.
 *
 * AND SOME OF WHAT IT BANNED ARE THE PRODUCT'S OWN WORDS. "Track" was the most frequent hit of all
 * at 159, and the scenario table - which Hafsah wrote - says "keep track of how the work is going"
 * and "see what is on track" six times over. "Measure" is in the card copy a person reads before
 * they choose. "Manager" is a scenario. Banning those in code would have had the product fighting
 * its own copy, so they are named below as deliberately NOT banned rather than quietly dropped.
 */

/**
 * NEVER WRITTEN, IN ANY CONTEXT. Performed empathy, editorialising, and filler.
 *
 * These have no honest use. "It sounds like" is an interpretation of somebody's feelings offered
 * back as a fact, and it opened a quarter of the turns in the one conversation that was read line
 * by line.
 */
export const PHRASES_WE_NEVER_WRITE = [
  'it sounds like',
  'it seems like',
  'I understand',
  'I hear you',
  "I'm here to listen",
  'that is a really important insight',
  'I can see this has been weighing',
  'takes courage to name',
  'this is a common pattern',
  'that is a really complex situation',
  'this was always going to surface',
  'that is the dynamic at the heart of this',
  'you are clearly someone who cares',
];

/**
 * NEVER INTRODUCED - BUT THEIR OWN WORD BACK IS NOT A FAULT.
 *
 * These position the product as an assessment tool, which is the one thing it is not. The rule is
 * that the PRODUCT never reaches for them; a person who says "my performance review" and hears
 * their own phrase used back is not being assessed, and refusing to say a word somebody has just
 * said is its own kind of strange. So this list is checked against what they have already said in
 * this conversation.
 */
export const WORDS_WE_DO_NOT_INTRODUCE = [
  'performance', 'appraisal', 'appraise', 'surveillance', 'KPI', 'grade', 'rank', 'verdict',
  'employee', 'employees', 'staff', 'subordinate', 'oversight', 'judgment', 'assess', 'evaluate',
  'score', 'scored', 'metric', 'metrics', 'monitor',
];

/**
 * DELIBERATELY NOT BANNED, THOUGH THE PROMPT BANS THEM.
 *
 * Every one of these is in the product's own user-facing copy. Banning them in code would make the
 * product refuse its own vocabulary, and it is why this list is curated rather than copied.
 */
export const THE_PROMPT_BANS_THESE_AND_IT_IS_WRONG = ['track', 'review', 'rate', 'measure', 'manage'];

const asWords = (list: string[]) => list.map((w) => new RegExp(`\\b${w}\\b`, 'i'));
const WORD_TESTS = asWords(WORDS_WE_DO_NOT_INTRODUCE);

/** What the reply used that it should not have. Empty means clean. */
export function wordsWeDoNotUse(reply: string, whatTheySaidSoFar: string[] = []): string[] {
  const text = reply ?? '';
  if (!text.trim()) return [];
  const theirs = (whatTheySaidSoFar ?? []).join(' ');
  const found: string[] = [];

  for (const phrase of PHRASES_WE_NEVER_WRITE) {
    if (text.toLowerCase().includes(phrase.toLowerCase())) found.push(phrase);
  }
  WORD_TESTS.forEach((test, i) => {
    const word = WORDS_WE_DO_NOT_INTRODUCE[i];
    if (!test.test(text)) return;
    /* Their own word handed back is not the product reaching for it. */
    if (new RegExp(`\\b${word}\\b`, 'i').test(theirs)) return;
    found.push(word);
  });
  return found;
}

export function sayItWithoutThose(found: string[]): string {
  const list = found.map((f) => `"${f}"`).join(', ');
  return `Your last reply used ${list}. ${
    found.length === 1 ? 'That is' : 'Those are'
  } on the list this product never uses: they either perform empathy instead of producing it, or they make a record read like an assessment, which is the one thing this is not.

Say the same thing again without ${found.length === 1 ? 'it' : 'them'}. Do not replace a banned word with a longer way of saying the same word: state what the record shows, and ask what you were going to ask.`;
}
