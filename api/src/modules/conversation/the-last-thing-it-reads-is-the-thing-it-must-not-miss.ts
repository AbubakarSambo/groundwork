/**
 * THE LAST THING IT READS IS THE THING IT MUST NOT MISS.
 *
 * The assembled prompt for one turn is about 113,000 characters. A rule written into the middle of
 * that is a suggestion, and on 17 September 2026 we watched one behave like one: a plain ban on
 * answering a complaint with a question about the complaint was added to ENGINE_RULES, seeded, and
 * confirmed present in the active prompt at character 31,345 - and the very next live run answered
 * "this questions is stupid" with "What makes that question not worth asking?", the banned sentence
 * almost word for word.
 *
 * That is not a guard problem and it was never going to be fixed by one. It is a position problem.
 *
 * SO THESE THREE GO LAST. They are appended after every other block, immediately before the model
 * writes, and they are deliberately three lines rather than thirty - a short block at the end reads
 * as an instruction, and a long one at the end is just more middle.
 *
 * WHAT EARNS A PLACE HERE. Only a rule that (1) was broken live, in front of somebody, (2) makes the
 * reply useless or insulting when broken, and (3) cannot be stated shorter. Everything else stays
 * where it is. A fourth rule is not a small addition: it is a 33% dilution of the only part of the
 * prompt that is short enough to be read as a rule rather than as background.
 *
 * IT IS NOT A GUARD. Nothing here inspects a reply, scores it, deletes from it or asks for another.
 * It is context going in, which is the only thing that has measurably improved this conversation.
 */

/** Always sent. Three lines, and the reason each one is here is a live run. */
export const THE_THREE_THINGS = [
  'BEFORE ANY OF THE ABOVE, THREE THINGS. They are last because they are the ones that get missed.',
  '',
  '1. ANSWER WHAT THEY ASKED. If their message contains a request - for an example, for what you meant, for something plainer - give them that first, in full, before you ask anything of your own. Their question outranks yours.',
  '2. A COMPLAINT IS INFORMATION, NOT A QUESTION TO ASK BACK. If they say a question is stupid, unclear or beside the point, they are telling you about the question. Take it, say what you were getting at in one line or drop it, and move to what they say it IS about. Never ask them to justify the objection.',
  '3. ONE ASK. Count what they would have to answer, not the question marks: two things joined by "and" is two asks, and only the second gets answered. An example inside an ask is part of that ask.',
].join('\n');

/**
 * AND ONE MORE LINE WHEN THEY HAVE JUST PUSHED BACK, because that is the moment rule 2 exists for
 * and the moment it is most likely to be read past. Named rather than general: a rule that arrives
 * only when it applies is read as being about this conversation.
 */
export const THEY_JUST_PUSHED_BACK =
  'AND RIGHT NOW: their last message is pushback on the questions themselves. Rule 2 is the whole of this turn. Do not re-ask, do not defend the question, and do not ask what would be better unless they have run out of things to say - answer the objection or let it go, and ask about the work.';

export function theThingsThatCannotBeMissed(theirLastMessage?: string | null, pushedBack = false): string {
  void theirLastMessage;
  return pushedBack ? `${THE_THREE_THINGS}\n${THEY_JUST_PUSHED_BACK}` : THE_THREE_THINGS;
}
