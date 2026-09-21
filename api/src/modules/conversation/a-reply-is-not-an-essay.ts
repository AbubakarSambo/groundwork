/**
 * "THE RESPONSES ARE SOO LONG ITS INSANE. THIS SOUNDS ZERO LIKE A HUMAN."
 *
 * Off a real setup conversation. She said "500 contracts by the end of the year" and got back:
 *
 *   "Got it. Five hundred contracts by the end of the year. What specific and observable thing will
 *    exist that would tell you, and anyone else who looks, that this objective was met?"
 *
 * Thirty-six words to ask one question. And when she pushed back, a hundred and twenty:
 *
 *   "This is a recall session. We're reconstructing a record from memory rather than building one in
 *    real time. That means it's less reliable - memory is reconstructed, not recorded. What you share
 *    here is what you said. What people said will be in the report. Neither is treated as
 *    definitive..."
 *
 * Nothing in the product constrained length. There are a hundred and thirty-six rules about what to
 * ask and not one about how much to say.
 *
 * WHY THIS IS SHAPE AND NOT JUDGEMENT. Whether a sentence is worth saying needs judgement. How many
 * of them there are does not. Somebody typing a sentence into a box and receiving five back knows
 * exactly what has happened, and no amount of quality in those five sentences fixes it.
 *
 * THE NUMBER. Sixty words, and it is deliberately not tight: a reply that gives something back and
 * then asks - "Sixty of the hundred and fifty. Rita is a concern. What are you seeing?" - fits in
 * twenty. Sixty is the point past which this is somebody explaining themselves rather than talking.
 *
 * THE CLOSE IS EXEMPT. The last turn names what now exists, with the figures and the people in it,
 * and that is the one place a longer reply earns its length.
 */

import { sentencesIn } from '../presentation/where-a-sentence-actually-ends';

/** Past this, it has stopped being a conversation. */
export const A_REPLY_IS_ABOUT = 60;

/**
 * AND THE CLOSE IS THE SHORTEST TURN, NOT THE LONGEST. Decided by Hafsah, 15 September 2026.
 *
 * This used to allow a close a hundred and forty words, on the reasoning that the last turn names
 * what now exists and that earns its length. The prompt said the opposite in two places - "THE
 * CLOSING TURN IS THE SHORTEST TURN OF THE SESSION" and "three sentences at most" - and the two
 * had been disagreeing for as long as both existed. Put to her with both arguments; she took the
 * three sentences.
 *
 * The reason that settles it: the report shows them their whole record the moment the session
 * ends, everybody's, in full. Reading it back first is saying the same thing twice, and it is
 * where the voice slips into summary. A close observed live ran to 72 words and six sentences.
 *
 * THE THREE. One: the thing THEY said they would do, in their words, with its date. Two: the
 * report is theirs and nothing needs acting on today. Three: goodbye.
 */
export const A_CLOSE_IS_AT_MOST = 3;

/*
 * A BACKSTOP, BECAUSE THREE SENTENCES CAN STILL BE A PARAGRAPH. Three sentences carrying a figure,
 * a date and a name sit comfortably under eighty; past that it is one long sentence doing what the
 * rule was written to stop.
 */
export const A_CLOSE_STILL_FITS_IN = 80;

export function howManyWords(text: string): number {
  return ((text ?? '').trim().match(/\S+/g) ?? []).length;
}

export function howManySentences(text: string): number {
  return sentencesIn(text ?? '').filter((s) => s.trim()).length;
}

export function isAnEssay(text: string, closing: boolean): boolean {
  if (!closing) return howManyWords(text) > A_REPLY_IS_ABOUT;
  return howManySentences(text) > A_CLOSE_IS_AT_MOST || howManyWords(text) > A_CLOSE_STILL_FITS_IN;
}

/** The close has its own instruction, because "shorter" does not say what a close is FOR. */
export const A_CLOSE_IS_THREE_SENTENCES = `That is the closing turn and it is too long. They are about to be shown their whole record, everybody's, in full - so reading it back to them first is saying the same thing twice.

Three sentences at most, and fewer is better. One: the thing THEY said they would do, in their own words, with its date if they gave one. Two: the report is theirs now. Never say nothing in it needs acting on; you cannot know that. Three: goodbye. Nothing else.`;

export const SAY_IT_SHORTER = `That reply is far longer than it needs to be. Somebody typing one sentence into a box and getting five back knows what has happened, however good the five are.

Say it again in under sixty words. Keep the question and whatever you were genuinely giving them; drop the explaining, the restating and the reasons for asking. If two things are worth saying, say the one that matters here.`;
