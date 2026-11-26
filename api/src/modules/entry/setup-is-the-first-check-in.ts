
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
  'Ask for that once you know what the work is, unless they have already told you, in these words or close to them: "Where do things stand today, as far as you know? If your team knows better, say so and their first check-in will ask them."',
  'If they say the details are their team\'s, or they do not know, that is their answer: their team\'s check-ins will ask for those details, so say that in a few words and move on.',
  'What they set this up to find out is never asked of them: when they want to know what is owed, what is about to slip or who is on what, that is what their team\'s check-ins will find, so do not ask them for the list.',
  'When they set this up to hear from their team what is happening ("tell me what\'s happening and what needs my attention"), where things stand is exactly what they want to find out: do not ask them it at all.',
  'Never ask what they have already said.',
].join(' ');

/**
 * The last line of setup, written by the product (F5, stage 5). Nothing is saved yet, so it says only what is true: setup has what it
 * needs, and the invitations go when the lead sends them. It no longer says the board is ready or points at a box "below" (round 7:
 * "It says the board is ready, but then I have to set everything up").
 */
export const SETUP_IS_DONE = 'That’s everything I need to start. Send the invitations when you are ready.';

/** Sentences about a next screen or a later first check-in belong to the two-part flow that is gone, so they are taken out. */
export function withoutTalkOfTheNextScreen(reply: string): string {
  return String(reply ?? '').split(/(?<=[.!?])\s+/)
    .filter((sentence) => !/\b(?:next screen|next step|on the next page|after that, your first check-in|your first check-in will be ready|check in too)\b/i.test(sentence))
    .join(' ').trim();
}
