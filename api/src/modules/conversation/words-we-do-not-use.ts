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
/**
 * AND THE SENTENCES THAT SOUND LIKE A MACHINE EXPLAINING A CATEGORY.
 *
 * Read off a live report, in full: "Because silence is usually a stage, not a rejection, it is
 * important to know that this kind of sales and expansion work often faces unfair reading, which
 * you should consider before making assumptions about your current standing."
 *
 * Her verdict on it was blunt and correct. Nobody speaks like that. It is about a CATEGORY rather
 * than about the person, it survives being deleted, and it is the reason a report with the right
 * facts in it still does not get read.
 *
 * Every one of these openers introduces a sentence about nothing. They are banned outright, the
 * same way the performed-empathy phrases are, because the fix for each is the same: say the thing
 * about this person instead.
 */
export const SAYS_NOTHING_ABOUT_ANYBODY = [
  'this kind of work',
  'this kind of sales',
  'this type of work',
  'it is important to know',
  'it is worth noting',
  'you should consider',
  'before making assumptions',
  'your current standing',
  'often faces unfair',
  'is usually a stage',
  'what decides whether',
  'tends to be misread',
  'is often misunderstood',
  'in situations like this',
  'generally speaking',
];

/**
 * WORDS THE PRODUCT USES ABOUT ITSELF, WHICH NOBODY SAYS OUT LOUD.
 *
 * "Checkable", "rests on", "read against", "anchored", "surface" as a verb. Every one of them is
 * the product describing its own machinery to somebody who only wants to know what is going on.
 */
export const OUR_WORDS_NOT_THEIRS = [
  'checkable',
  'rests on',
  'read against',
  'anchored to',
  'unfair reading',
  'the record shows over time',
  'surfaced to',
];

/** Remarks about how much somebody is saying. Checked lower-case, as every phrase here is. */
export const ABOUT_HOW_MUCH_THEY_SAY = [
  'shorter answers', 'answers are shorter', 'answers have been shorter', 'answers have been short',
  'your answers are short', 'you have been brief', "you've been brief", 'you are being brief',
  'you seem quieter', 'you have been quiet', "you've been quiet", 'not saying much',
];

export const PHRASES_WE_NEVER_WRITE = [
  ...SAYS_NOTHING_ABOUT_ANYBODY,
  ...OUR_WORDS_NOT_THEIRS,
  /* Task 2.8, week 4: never comment on someone's answers getting shorter. The prompt says so ("DO NOT
     COMMENT ON ENGAGEMENT"); this is the code's copy, so a slip is asked for again rather than sent. */
  ...ABOUT_HOW_MUCH_THEY_SAY,
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
  /*
   * OUR WORD FOR WHAT THE PRODUCT DOES, SAID TO THE PERSON USING IT.
   *
   * Hafsah, 23 September 2026, after a live check-in: "you used on the record alot which is
   * fucking annoying." Five times in one conversation, three of them as the whole reply. It is
   * jargon, and to somebody answering questions about their own work it reads as a warning.
   *
   * The product still keeps a record and still says so where that is the point - the landing
   * screen, the report, the close. What comes out is the conversation reaching for it as filler.
   */
  'on this record',
  'on the record',
  'goes on your record',
  'on your record',
  /*
   * AND THE PRODUCT APOLOGISING FOR ITSELF, THREE TIMES IN ONE CONVERSATION.
   *
   * Read live, 23 September 2026: "You are right. My apologies. I got ahead of myself." Then "You
   * are right. This is about your contribution... My apologies." Then "You did. My mistake."
   *
   * An existing guard covers the opposite case - a PERSON saying sorry to a check-in, see
   * an-apology-is-not-owed - and nothing covered this one. It is not politeness. Somebody who has
   * just pointed out that the question was already answered gets a paragraph of contrition and
   * then, two turns later, the same behaviour: the apology is what the model does INSTEAD of
   * thinking, and it is a large part of "the conversation shows no reasoning".
   *
   * What to do instead is in the prompt: take the correction, say the corrected thing in one
   * clause, ask the next question.
   */
  'my apologies',
  'my mistake',
  'i apologise',
  'i apologize',
  'i got ahead of myself',
  'you are right. ',
  'you are right,',
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

/**
 * AND THE INSTRUCTION QUOTES THE SENTENCE, BECAUSE NAMING THE WORD WAS NOT ENOUGH.
 *
 * Measured across nineteen live check-ins: this guard fired ten times and the second try was clean
 * twice. The same failure shape the restating guard had, and the same cause - it named the fault
 * and left the model to find its own way out, and the way out it kept finding was the phrasing it
 * had just been told not to use.
 *
 * NO SURGICAL FALLBACK HERE, and that is deliberate. The restating guard can drop its opening
 * sentence because that sentence carries nothing. Here it would be the opposite: "It sounds like
 * you are carrying the weight of this" with the lead-in removed becomes "You are carrying the
 * weight of this" - a hedge turned into a verdict about somebody's feelings, which is the exact
 * thing the ban exists to stop. A worse reply, arrived at faster.
 */
export function sayItWithoutThose(found: string[], reply = ''): string {
  const list = found.map((f) => `"${f}"`).join(', ');
  const one = found.length === 1;
  const sentence = (reply || '')
    .split(/(?<=[.?!])\s+/)
    .find((s) => found.some((f) => s.toLowerCase().includes(f.toLowerCase())))
    ?.trim();

  return `Your last reply used ${list}. ${one ? 'That is' : 'Those are'} on the list this product never uses: they either perform empathy instead of producing it, or they make a record read like an assessment, which is the one thing this is not.
${sentence ? `\nThis is the sentence:\n"${sentence}"\n` : ''}
Write the reply again with ${one ? 'that word' : 'those words'} gone, and do not reach for a longer way of saying the same thing - "it seems to me that", "what I am hearing is", "your delivery record" are the same move with more syllables.

Say the thing itself instead. Any of these works:
- state what the record holds, as a fact: "The forecast went out with gaps."
- say what they told you, in their words, without a verb of interpretation in front of it
- drop the preamble entirely and ask the question straight

You are not reading somebody's feelings back to them. You are building a record with them.`;
}
