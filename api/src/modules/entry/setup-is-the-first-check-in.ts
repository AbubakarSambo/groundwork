
/**
 * THE LEAD'S SETUP IS THEIR FIRST CHECK-IN (Hafsah, 26 October 2026).
 *
 * One conversation gathers what the board needs (what it is for, the kind of work, who is in it, the targets, how often) and the lead's
 * own first update: where things stand today and what is open. It asks only what is missing, never repeats, and ends the way every
 * check-in ends: it offers to wrap up in its own words, says back what it set up and asks whether anything is wrong (HOW_SETUP_ENDS in
 * conversation/a-short-day.ts), then one line saying what happens next. There is no separate
 * first check-in after it. Said to the model in code on every turn, so it holds whichever stored prompt is active.
 */
/*
 * THE LEAD'S UPDATE IS WHAT THE LEAD KNOWS (round 6, the law firm lead, 1 November 2026). This asked for "each open deal, task or problem,
 * its next step and its day", and the board's turn said to ask it "if they have not yet said where things stand". She said, again and again,
 * that her team holds those details, which is the whole reason the team checks in; that was not "where things stand", so it was asked
 * again, and she started over three times. What she knows, including that the team holds the rest, is her update.
 */
export const THE_FIRST_UPDATE_TOO = [
  'THIS CONVERSATION IS ALSO THE LEAD\'S FIRST CHECK-IN.',
  'Besides what the board needs, find out where things stand today and what is open, as far as the lead knows it.',
  'Ask for that in one question once you know what the work is, unless they have already told you.',
  'If they say the details are their team\'s, or they do not know, that is their answer: their team\'s check-ins will ask for those details, so say that in a few words and move on.',
  'Never ask what they have already said.',
].join(' ');

/** The last line of setup, written by the product. */
export const SETUP_IS_DONE = 'Your board is ready with today’s picture. Next, add your team below and choose when their first check-in opens. Anything else worth holding it against can go on its Context and resources tab at any time.';

/** Sentences about a next screen or a later first check-in belong to the two-part flow that is gone, so they are taken out. */
export function withoutTalkOfTheNextScreen(reply: string): string {
  return String(reply ?? '').split(/(?<=[.!?])\s+/)
    .filter((sentence) => !/\b(?:next screen|next step|on the next page|after that, your first check-in|your first check-in will be ready|check in too)\b/i.test(sentence))
    .join(' ').trim();
}
