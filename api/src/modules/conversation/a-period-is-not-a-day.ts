/**
 * "IF I SAY END OF YEAR IT SHOULD RESPOND WITH DECEMBER? WHAT DATE?"
 *
 * Her instruction on deadlines has two halves and she gave them both at once: "yes infer a date but
 * be sure to probe for details in the engine." The inferring has been in when-words-mean-a-date
 * since it was written. The probing was written too - `askWhenTheyMean` - and nothing in the
 * product ever called it. Two specs, no callers.
 *
 * So a person could answer a direct question about when with "by the end of the year", and the
 * conversation would move on. The date on their record was either our reading of a period they
 * never confirmed, or nothing at all.
 *
 * TWO DIFFERENT FAULTS AND TWO DIFFERENT QUESTIONS.
 *
 * A PERIOD ("end of the year", "next quarter") has a reading. Say the reading and check it: "When
 * you say end of the year, do you mean 31 December 2026?" That is one short question with an
 * answer in it.
 *
 * SOMETHING VAGUE ("soon", "when procurement clears") has no reading at all, and the question is
 * open: which day is that. `askWhenTheyMean` has always had the right words for this.
 *
 * NEITHER IS A RETRY. The other guards here read what the product just wrote and ask it again.
 * This reads what the PERSON just said and tells the next reply what to do with it, which is why
 * it composes with everything else rather than competing with it.
 */
import { whenTheyMeant, thePeriodTheyNamed, sayTheDateAndCheckIt, askWhenTheyMean } from './when-words-mean-a-date';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';

/** Phrases that promise a time without being one. Kept narrow: these are the ones people type. */
const A_DEADLINE_WITH_NO_DAY = [
  'soon', 'shortly', 'asap', 'as soon as', 'in due course', 'at some point', 'eventually',
  'next sprint', 'this sprint', 'when procurement clears', 'once', 'in a few weeks', 'in a couple of weeks',
];

/*
 * Words that make a sentence a PROMISE rather than an observation.
 *
 * "I will get the forecast to her soon" is a promise and the day matters. "She is settling in and
 * it will feel normal soon enough" is not, and asking which day that is reads as a machine that
 * heard one word. The difference is mostly who the sentence is about: somebody saying what THEY
 * will do, or a verb that only appears when something is being delivered.
 */
const SOUNDS_LIKE_A_PROMISE =
  /\b(?:i|we)(?:'ll| will| am going to| are going to)\b|\b(by|before|deadline|due|finish|deliver|ship|complete|hand over|send|submit|close)\b/i;

/*
 * "YEAR-END - SO 31 DECEMBER 2026?" SEVEN TIMES IN A ROW, AND IT ENDED HER CHECK-IN.
 *
 * Seen twice on the handover scenario (fix6-1 and fix6-2). Patience said "my year-end
 * reconciliation process relies on a spreadsheet on my personal drive". That is not a deadline;
 * it is the most important thing she knows. The product asked whether year-end meant 31 December
 * 2026. She said no, the last year-end was 31 December 2023. The product asked again, because her
 * answer had "year-end" in it too, and it kept asking until the question limit closed her
 * check-in. Three faults, and each one alone would have stopped it.
 *
 * 1. Her answer already named a day. A sentence with "31 December 2023" in it has a date, and
 *    asking which date it means is asking whether she meant what she typed.
 * 2. A period was checked wherever it appeared, even where nothing was being promised. The vague
 *    words have always needed the sentence to sound like a promise; a period did not. Now it does:
 *    a time word in front of it ("by the end of the year", "before year-end", "in H1"), or
 *    somebody saying what they will do, or a deadline or target in the same sentence. "By" is
 *    still the first of those, so "I will have it done by the end of the year" is still checked.
 * 3. It never remembered it had asked. If an earlier reply in THIS check-in already asked about
 *    the same period, or already said the same date, it is not asked again. Only the product's own
 *    turns in this one check-in are read, never anybody else's.
 */
function normalised(text: string): string {
  return (text ?? '').toLowerCase().replace(/[-\s]+/g, ' ').trim();
}

const A_MONTH = '(?:january|february|march|april|may|june|july|august|september|october|november|december)';
/* "31 December 2023", "the 15th of May", "December 1 2026", "2026-03-14", "14/03/2026". */
const NAMES_A_DAY = new RegExp(
  `\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?${A_MONTH}\\b|\\b${A_MONTH}\\s+\\d{1,2}(?:st|nd|rd|th)?\\b|\\b\\d{4}-\\d{2}-\\d{2}\\b|\\b\\d{1,2}/\\d{1,2}/\\d{2,4}\\b`,
  'i',
);

/* A time word directly in front of the period, which is how a deadline is said. */
const A_TIME_WORD_BEFORE = /\b(?:by|before|until|till|for|at|in|during|within|towards?|around)\s+(?:the\s+)?$/i;
const A_TIME_WORD_INSIDE = /^(?:by|before|until|till|for|at|in|during|within|towards?|around)\b/i;

/* Somebody saying what they will do, or a deadline or target named outright. */
const A_PROMISE_AROUND_A_PERIOD =
  /\b(?:i|we|they|she|he)(?:'ll| will| am going to| are going to| is going to| plan to| aim to| want to| need to| have to| must)\b|\b(?:deadline|due|target|targets|goal|goals)\b/i;

/** The sentence the period sits in, so a date or a promise elsewhere in the message does not count. */
function theSentenceWith(said: string, period: string): { sentence: string; before: string } {
  const sentences = said.match(/[^.!?\n]+[.!?]*/g) ?? [said];
  for (const sentence of sentences) {
    const at = sentence.indexOf(period);
    if (at !== -1) return { sentence, before: sentence.slice(0, at) };
  }
  return { sentence: said, before: said.slice(0, Math.max(0, said.indexOf(period))) };
}

function isADeadline(said: string, period: string): boolean {
  const { sentence, before } = theSentenceWith(said, period);
  if (NAMES_A_DAY.test(sentence)) return false;
  if (A_TIME_WORD_INSIDE.test(period) || A_TIME_WORD_BEFORE.test(before)) return true;
  return A_PROMISE_AROUND_A_PERIOD.test(sentence);
}

function alreadyAsked(period: string, theDate: string | null, earlierReplies: string[]): boolean {
  const p = normalised(period).replace(/^(?:by|before|until|in|the)\s+/, '');
  return earlierReplies.some((reply) => {
    if (theDate && !didNotSayTheDate(reply, theDate)) return true;
    return normalised(reply).includes(p);
  });
}

/**
 * The period in what they just said that is worth asking about, and the day it reads as. Null
 * where there is nothing to ask. `earlierReplies` is what the product itself wrote earlier in this
 * check-in.
 */
function thePeriodToCheck(theySaid: string, on: Date, earlierReplies: string[]): { period: string; day: Date | null } | null {
  const said = (theySaid ?? '').trim();
  if (!said) return null;
  const period = thePeriodTheyNamed(said);
  if (!period) return null;
  if (!isADeadline(said, period)) return null;
  const day = whenTheyMeant(period, on);
  if (alreadyAsked(period, day ? whenItWas(day, 'full', 'UTC') : null, earlierReplies)) return null;
  return { period, day };
}

export function whatToDoAboutTheirDeadline(theySaid: string, on: Date, earlierReplies: string[] = []): string | null {
  const said = (theySaid ?? '').trim();
  if (!said) return null;

  /*
   * A PERIOD FIRST, because "end of the year" contains no vague word and would otherwise pass.
   * The date is the product's reading of it, which is exactly why it is checked rather than kept.
   * A period that is not a deadline, or was already asked about, is left alone, and so is the
   * rest of the message: a sentence with a period in it is not then read for vague words.
   */
  if (thePeriodTheyNamed(said)) {
    const toCheck = thePeriodToCheck(said, on, earlierReplies);
    if (!toCheck) return null;
    if (toCheck.day) return sayTheDateAndCheckIt(toCheck.period, toCheck.day);
    /*
     * A PERIOD WITH NO READING IS STILL A PERIOD. "This quarter" needs a financial year nobody has
     * told us, and that file is right to refuse it rather than guess. There is still a question to
     * ask, and it is the open one.
     */
    return askWhenTheyMean(toCheck.period);
  }

  /*
   * And the genuinely vague, but only where the sentence is about something being done. "I will
   * get to it soon" is a promise. "The team is settling in soon enough" is not, and asking which
   * day that is reads as a machine that heard one word.
   */
  const low = said.toLowerCase();
  const vague = A_DEADLINE_WITH_NO_DAY.find((p) => low.includes(p));
  if (vague && SOUNDS_LIKE_A_PROMISE.test(said)) return askWhenTheyMean(vague);

  return null;
}

/**
 * AND THE CHECK THAT IT ACTUALLY ASKED, BECAUSE THE INSTRUCTION ALONE LOST TWICE.
 *
 * Driven live: the instruction fired, and the reply asked whether the pricing was somebody else's
 * job. Fired again: the reply asked what would tell them the contracts were closed. Both are decent
 * questions and neither contains the date. There is a note in this codebase about exactly this -
 * "the product writes the citation, the model only asks the question; the prompt-wording route is
 * exhausted, don't reopen it" - and this is the same shape.
 *
 * So: the date is checkable in the text. If it is missing, ask once more with nothing in front of
 * the instruction, which is the shape that works everywhere else here.
 */
export function theDateItHadToSay(theySaid: string, on: Date, earlierReplies: string[] = []): string | null {
  /* The same three tests as the instruction, so the check never forces a question it was told not to ask. */
  const toCheck = thePeriodToCheck(theySaid, on, earlierReplies);
  return toCheck?.day ? whenItWas(toCheck.day, 'full', 'UTC') : null;
}

export function didNotSayTheDate(reply: string, theDate: string): boolean {
  const text = (reply ?? '').toLowerCase();
  if (!theDate) return false;
  /* "31 December 2026", or the day and month without the year, which is how people write it. */
  const [d, month] = theDate.split(' ');
  return !text.includes(theDate.toLowerCase()) && !(text.includes(d) && text.includes(month.toLowerCase()));
}

export const SAY_THE_DATE = (period: string, theDate: string) => `Your reply did not contain the date. They said "${period}", which is a period rather than a day, and ${theDate} is what the product reads that as - a reading they have never seen and cannot confirm unless you say it.

Write the reply again as that one question and nothing else: "When you say ${period}, do you mean ${theDate}?"

Nothing before it, no second question after it, and do not explain why you are asking. Saying the date is not repeating them back: the date is ours, not theirs.`;

/**
 * AND WHEN IT STILL WILL NOT, THE PRODUCT SAYS IT.
 *
 * The instruction lost, and so did the focused retry. There is a decision in this codebase from the
 * last time this exact thing happened - a date the model would not quote - and it reads: "the
 * product writes the citation, the model only asks the question; the prompt-wording route is
 * exhausted, don't reopen it."
 *
 * So this is the turn. One sentence, written here, with the date in it, and a question mark. It
 * REPLACES the reply rather than joining it, because two questions in one turn is a rule this
 * product does not break - and the question the model wanted to ask is still a good one, which it
 * can ask on the next turn once this is answered.
 *
 * The bar for taking a turn over is high and this clears it: the person gave a deadline, the
 * product has read it as a specific day, and that reading goes onto their record either way. A day
 * nobody confirmed is what a later check-in asks somebody why they missed.
 */
export function theQuestionTheProductAsks(period: string, theDate: string): string {
  /* A full sentence. "Year-end - so 31 December 2026?" was two pieces joined with a dash, which is
     the kind of clipped line nothing a person reads may be. The date stays exact, because
     didNotSayTheDate looks for it. */
  return `When you say ${period.toLowerCase()}, do you mean ${theDate}?`;
}

/**
 * A REPLY THAT IS OUR OWN INSTRUCTION, SENT TO A PERSON.
 *
 * Seen on the handover scenario (fix6-2). Jide said he had never done a year-end close. The reply
 * left the date out, so the model was asked again with SAY_THE_DATE, and what came back was the
 * instruction itself, lightly reworded: "You said "year-end", which is a period rather than a
 * day, and 31 December 2026 is what the product reads that as..." It said the date, so the check
 * let it through, and Jide read our note to the model as the product talking to him.
 *
 * So a retry is refused when it repeats the instruction: six or more words in a row taken from it,
 * or one of the phrases only the instruction uses. The line the instruction asks for is in quotes
 * inside it, and quoted text is left out of the comparison, so the right answer is never refused
 * for being the right answer. Refused means the product asks the question itself.
 */
const ONLY_THE_INSTRUCTION_SAYS = ['rather than a day', 'what the product reads', 'write the reply again'];

function wordsOf(text: string): string[] {
  return (text ?? '').toLowerCase().match(/[a-z0-9']+/g) ?? [];
}

export function repeatsTheInstruction(reply: string, instruction: string, run = 6): boolean {
  const low = (reply ?? '').toLowerCase();
  if (ONLY_THE_INSTRUCTION_SAYS.some((p) => low.includes(p))) return true;
  const theirs = wordsOf(reply);
  if (theirs.length < run) return false;
  const ours = wordsOf((instruction ?? '').replace(/"[^"]*"/g, ' '));
  const runsOfOurs = new Set<string>();
  for (let i = 0; i + run <= ours.length; i++) runsOfOurs.add(ours.slice(i, i + run).join(' '));
  for (let i = 0; i + run <= theirs.length; i++) {
    if (runsOfOurs.has(theirs.slice(i, i + run).join(' '))) return true;
  }
  return false;
}
