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

/** Past this, it has stopped being a conversation. */
export const A_REPLY_IS_ABOUT = 60;

/** Where a reply may run long, because it is doing something a short one cannot. */
export const A_CLOSE_MAY_RUN_TO = 140;

export function howManyWords(text: string): number {
  return ((text ?? '').trim().match(/\S+/g) ?? []).length;
}

export function isAnEssay(text: string, closing: boolean): boolean {
  return howManyWords(text) > (closing ? A_CLOSE_MAY_RUN_TO : A_REPLY_IS_ABOUT);
}

export const SAY_IT_SHORTER = `That reply is far longer than it needs to be. Somebody typing one sentence into a box and getting five back knows what has happened, however good the five are.

Say it again in under sixty words. Keep the question and whatever you were genuinely giving them; drop the explaining, the restating and the reasons for asking. If two things are worth saying, say the one that matters here.`;
