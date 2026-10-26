import { askedAnythingElse, saysThereIsNothingMore, ANYTHING_ELSE, FOLLOW_UPS_ON_WHAT_THEY_ADDED } from '../conversation/a-short-day';

/**
 * THE LEAD'S SETUP IS THEIR FIRST CHECK-IN (Hafsah, 26 October 2026).
 *
 * One conversation gathers what the board needs (what it is for, the kind of work, who is in it, the targets, how often) and the lead's
 * own first update: where things stand today and what is open. It asks only what is missing, never repeats, and ends the way every
 * check-in ends: "Anything else I should know?", then one line saying what was set up and what happens next. There is no separate
 * first check-in after it. Said to the model in code on every turn, so it holds whichever stored prompt is active.
 */
export const THE_FIRST_UPDATE_TOO = [
  'THIS CONVERSATION IS ALSO THE LEAD\'S FIRST CHECK-IN.',
  'Besides what the board needs, find out where things stand today and what is open: each open deal, task or problem, its next step and its day.',
  'Ask for that in one question once you know what the work is, unless they have already told you.',
  'Never ask what they have already said.',
].join(' ');

/** Said once the board's needs are met. The model asks for the first update if it is missing, otherwise the last question. */
export const THE_BOARD_IS_COVERED = `THE BOARD HAS WHAT IT NEEDS. If they have not yet said where things stand today and what is open, ask that now, in one question. If they have, your next question is exactly: "${ANYTHING_ELSE}", alone in its turn.`;

export const THEY_ADDED_SOMETHING_IN_SETUP = `They answered "${ANYTHING_ELSE}" with something new. Take it as said and say in a few words where it goes. Ask at most ${FOLLOW_UPS_ON_WHAT_THEY_ADDED} follow-up questions about it, and only for what the board needs.`;

/** The last line of setup, written by the product. */
export const SETUP_IS_DONE = 'Done: your board is ready with today’s picture. Next, add your team below and choose when their first check-in opens.';

/**
 * Where the end of setup stands, from its own turns. `close` is true once they said there is nothing more after "Anything else I should
 * know?" (or, once the board is covered, at all), or the follow-ups on what they added are done.
 */
export function whereSetupEnds(aiTurnsNewestFirst: readonly string[], theirLast: string, boardIsCovered = false): { asked: boolean; close: boolean } {
  const i = aiTurnsNewestFirst.findIndex((t) => askedAnythingElse(t));
  /* "No, that's all" ends setup once the board has what it needs, whether or not the last question was asked in so many words. */
  if (i < 0) return { asked: false, close: boardIsCovered && saysThereIsNothingMore(theirLast) };
  return { asked: true, close: (i === 0 && saysThereIsNothingMore(theirLast)) || i >= FOLLOW_UPS_ON_WHAT_THEY_ADDED };
}

/** What the model is told this turn about the end of setup, if anything. */
export function whatToSayAboutTheEndOfSetup(boardIsCovered: boolean, end: { asked: boolean; close: boolean }): string | null {
  if (end.close) return null;
  if (end.asked) return THEY_ADDED_SOMETHING_IN_SETUP;
  return boardIsCovered ? THE_BOARD_IS_COVERED : null;
}

/** Sentences about a next screen or a later first check-in belong to the two-part flow that is gone, so they are taken out. */
export function withoutTalkOfTheNextScreen(reply: string): string {
  return String(reply ?? '').split(/(?<=[.!?])\s+/)
    .filter((sentence) => !/\b(?:next screen|next step|on the next page|after that, your first check-in|your first check-in will be ready|check in too)\b/i.test(sentence))
    .join(' ').trim();
}
