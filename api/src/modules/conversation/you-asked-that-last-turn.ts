/**
 * YOU ASKED THAT LAST TURN.
 *
 * The product already refuses to ask the same question a THIRD time - alreadyAskedTwice, and the
 * account of why is in asked-twice-and-told-no-twice. Nothing looked at the second, and the second
 * is what people actually read, because it arrives in the very next breath.
 *
 * MEASURED 18 SEPTEMBER 2026, against a client who expects a lot, with each of the 22 situations
 * given its own material: twenty of twenty-two lead conversations and twenty-two of twenty-two
 * participant ones repeated a question, and almost every repeat was consecutive.
 *
 *   R4  "What would need to exist for it to be settled?"
 *   R5  "What would need to exist for it to be settled?"
 *
 * WHEN IT HAPPENS. Almost always straight after the person pushes back or changes the subject - they
 * say the question does not help, or they ask their own, and the reply deals with that and then puts
 * the same sentence back. Re-asking is often RIGHT: they did not answer. Asking again in the same
 * words is what makes it read as not listening.
 *
 * SO THIS IS NOT A GUARD AND IT DELETES NOTHING. It is the last question, handed back as context,
 * with one instruction: if you still need it, ask it differently and say why you are asking again.
 * Context going in is the only mechanism that has measured clean all week.
 */

/** Questions in a reply, in the order they were asked. */
export function theQuestionsIn(reply: string): string[] {
  return (reply ?? '').match(/[^.?!]*\?/g)?.map((q) => q.trim()).filter(Boolean) ?? [];
}

/**
 * What to put in front of the model, or nothing at all when the last turn asked nothing - an opener
 * that made a statement, or a close.
 */
export function whatYouAskedLastTurn(lastReply?: string | null): string {
  const asked = theQuestionsIn(lastReply ?? '');
  if (!asked.length) return '';
  const last = asked[asked.length - 1];
  return `WHAT YOU ASKED LAST TURN

You asked: "${last}"

If they answered it, do not ask it again in any form - take what they gave you and move on.

If they did not - they pushed back, changed the subject, or answered something adjacent - you may
still need it, and you may ask again ONCE. Not in these words. Ask it differently, and say in the
same breath why you are coming back to it, so it reads as somebody still listening rather than a
form that did not register the answer. "I am still stuck on X, because Y" is the whole of it.

Never send the sentence above again as it stands.`;
}
