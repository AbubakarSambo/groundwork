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
 * AND ONE TURN BACK WAS NOT FAR ENOUGH. Read on a live sales check-in, 20 September 2026:
 *
 *   R2  "What is your portion of the 30 new and 10 million credit targets?"
 *   R3  "What is your portion of the 30 new and 10 million credit targets?"
 *   R4  "What is your portion of the 30 new and 10 million credit targets?"
 *
 * Three times, word for word, at a person who had answered it in his first sentence. Handing back
 * only the LAST question cannot stop that: by the third ask the block says "you asked X", the model
 * decides it is still unanswered, and asks X again. So it hands back everything it has asked in
 * this session, and it says the thing the one-question version could not: a question asked twice is
 * dead. Take what they gave you, or say plainly you did not understand the answer.
 *
 * WHERE IT SITS. Second to last, after everything this turn must not miss and before the pattern
 * probe, because position is the one lever that has measured clean all week. It was earlier in the
 * list and a live run still put the same sentence back twice in a row.
 *
 * SO THIS IS NOT A GUARD AND IT DELETES NOTHING. It is the last question, handed back as context,
 * with one instruction: if you still need it, ask it differently and say why you are asking again.
 * Context going in is the only mechanism that has measured clean all week.
 */

/** Questions in a reply, in the order they were asked. */
export function theQuestionsIn(reply: string): string[] {
  return (reply ?? '').match(/[^.?!]*\?/g)?.map((q) => q.trim()).filter(Boolean) ?? [];
}

/** Compared without punctuation or case, because "the same words" is about the words. */
export function theSameQuestion(a: string, b: string): boolean {
  const bare = (q: string) => q.toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim();
  return !!a && !!b && bare(a) === bare(b);
}

/**
 * What to put in front of the model, or nothing at all when nothing has been asked yet - an opener
 * that made a statement, or a close.
 *
 * @param lastReply the previous turn
 * @param earlierReplies every earlier turn this session, newest first, so a question asked three
 *        turns ago is still visible. One turn of memory is what let the same sentence go out three
 *        times in a row.
 */
export function whatYouAskedLastTurn(lastReply?: string | null, earlierReplies: string[] = []): string {
  const asked = theQuestionsIn(lastReply ?? '');
  const before = earlierReplies.flatMap((r) => theQuestionsIn(r));
  if (!asked.length && !before.length) return '';
  const last = asked[asked.length - 1] ?? '';

  /* A question already asked twice is not a question any more: it is the conversation stuck. */
  const twice = [...new Set(
    [...theQuestionsIn(lastReply ?? ''), ...before].filter((q, _i, all) => all.filter((x) => theSameQuestion(x, q)).length > 1),
  )].slice(0, 3);

  const lines = [`WHAT YOU HAVE ALREADY ASKED THIS SESSION`, ''];
  if (last) lines.push(`Last turn you asked: "${last}"`, '');
  if (before.length) {
    lines.push('Earlier you asked:', ...before.slice(0, 6).map((q) => `- ${q}`), '');
  }
  lines.push(
    'If they answered, take what they gave you and move on.',
    '',
    'If they did not, you may come back to it ONCE, in different words, saying why you are asking again.',
  );
  if (twice.length) {
    lines.push(
      '',
      'THESE HAVE BEEN ASKED TWICE ALREADY AND ARE FINISHED. Do not send any of them again in any form:',
      ...twice.map((q) => `- ${q}`),
      '',
      'Say in one sentence that you still do not have it. Then ask about something else, or say what you would do with the answer and leave it with them.',
    );
  }
  lines.push('', 'Sending a question again in the words it was already sent in is the one thing you may not do.');
  return lines.join('\n');
}
