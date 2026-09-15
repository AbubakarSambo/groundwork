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
 * A PERIOD ("end of the year", "next quarter") has a reading. Say the reading and check it: "end of
 * the year - so 31 December 2026?" That is one short question with an answer in it.
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

export function whatToDoAboutTheirDeadline(theySaid: string, on: Date): string | null {
  const said = (theySaid ?? '').trim();
  if (!said) return null;

  /*
   * A PERIOD FIRST, because "end of the year" contains no vague word and would otherwise pass.
   * The date is the product's reading of it, which is exactly why it is checked rather than kept.
   */
  const period = thePeriodTheyNamed(said);
  if (period) {
    const meansThisDay = whenTheyMeant(period, on);
    if (meansThisDay) return sayTheDateAndCheckIt(period, meansThisDay);
    /*
     * A PERIOD WITH NO READING IS STILL A PERIOD. "This quarter" needs a financial year nobody has
     * told us, and that file is right to refuse it rather than guess. There is still a question to
     * ask, and it is the open one.
     */
    return askWhenTheyMean(period);
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
export function theDateItHadToSay(theySaid: string, on: Date): string | null {
  const period = thePeriodTheyNamed(theySaid);
  if (!period) return null;
  const day = whenTheyMeant(period, on);
  return day ? whenItWas(day, 'full', 'UTC') : null;
}

export function didNotSayTheDate(reply: string, theDate: string): boolean {
  const text = (reply ?? '').toLowerCase();
  if (!theDate) return false;
  /* "31 December 2026", or the day and month without the year, which is how people write it. */
  const [d, month] = theDate.split(' ');
  return !text.includes(theDate.toLowerCase()) && !(text.includes(d) && text.includes(month.toLowerCase()));
}

export const SAY_THE_DATE = (period: string, theDate: string) => `Your reply did not contain the date. They said "${period}", which is a period rather than a day, and ${theDate} is what the product reads that as - a reading they have never seen and cannot confirm unless you say it.

Write the reply again as that one question and nothing else: "${period} - so ${theDate}?"

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
  return `${period.charAt(0).toUpperCase()}${period.slice(1)} - so ${theDate}?`;
}
