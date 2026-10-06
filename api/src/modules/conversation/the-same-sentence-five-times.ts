/**
 * THE SAME SENTENCE, FIVE TIMES, INSTEAD OF AN ANSWER.
 *
 * Read on a live check-in on 23 September 2026. Hafsah asked "what went well about my work?" and
 * got "That goes on this record as you put it." She asked "what do you mean its not about
 * personal" and got "That goes on this record as you put it." She wrote "you are repeating
 * yourself, please end the session" and got "That goes on this record as you put it." Her words:
 * "you used on the record alot which is fucking annoying."
 *
 * IT WAS NOT THE MODEL. The sentence is ours. `withinTheHomeworkBudget` cuts the homework question
 * out of a reply once it has been asked twice, and where cutting empties the reply it substituted
 * that fixed line - so every time the model over-asked, the person got the identical sentence, and
 * whatever they had actually said or asked was thrown away with it.
 *
 * Two things are wrong with that and they are separate.
 *
 * FIRST, A FILLER IS NOT A REPLY. A person who asked a question and gets an acknowledgement has
 * been ignored, and being ignored in the same words each time reads as a broken machine. Where a
 * cut leaves nothing, the turn asks for the next thing instead of announcing a filing.
 *
 * SECOND, NOBODY SAYS "ON THE RECORD" FIVE TIMES. It is our word for what the product does, and in
 * a conversation it is both jargon and a warning. The replacements say the plain thing: got it,
 * noted, that is down.
 *
 * WHY A ROTATION RATHER THAN ONE BETTER SENTENCE. One sentence repeated is the fault being fixed.
 * The turn number picks the wording, deterministically, so the same conversation never uses the
 * same acknowledgement twice running - and none of them says "record".
 */
import { WHAT_ELSE, aQuestionNotYetAsked } from './nobody-is-left-looking-at-a-paragraph';

/** The phrase this file exists to remove, kept so the guards can name it exactly. */
export const THE_SENTENCE_WE_SAID_FIVE_TIMES = 'That goes on this record as you put it.';

/**
 * Plain acknowledgements, none of them about a record, none of them the same as the next.
 *
 * Each one is followed by a question, because an acknowledgement on its own is a dead end - see
 * nobody-is-left-looking-at-a-paragraph.
 */
const PLAINLY = [
  'Got it.',
  'Noted.',
  'That is down.',
  'Understood.',
];

/**
 * What to say where a guard has cut the whole reply away.
 *
 * `soFar` is how many turns have already happened; it only picks the wording, so the same
 * conversation does not repeat itself and two people do not read the same script.
 */
export function insteadOfAFiller(soFar: number, earlierAiTurns: string[] = []): string {
  const which = PLAINLY[Math.max(0, soFar) % PLAINLY.length];
  return `${which} ${aQuestionNotYetAsked(WHAT_ELSE, earlierAiTurns) ?? WHAT_ELSE}`;
}

/**
 * AND NO REPLY IS EVER THE PREVIOUS REPLY.
 *
 * The rotation above stops OUR filler repeating. This stops the model's own turn repeating, which
 * is the other half of what she read: "That goes on this record as you put it." arrived twice in a
 * row from two different code paths, and the second one is indistinguishable from a page that has
 * stopped working.
 *
 * Compared on letters and digits only, so a difference in punctuation or spacing is not treated as
 * a new sentence.
 */
const bones = (t: string) => (t ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');

export function notTheSameAsLastTime(reply: string, lastAiTurn: string | null | undefined, soFar: number): string {
  const said = (reply ?? '').trim();
  if (!said || !lastAiTurn) return said;
  if (bones(said) !== bones(lastAiTurn)) return said;
  return insteadOfAFiller(soFar + 1);
}
