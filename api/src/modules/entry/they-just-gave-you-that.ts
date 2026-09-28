/**
 * DO NOT ASK SOMEBODY FOR THE THING THEY HAVE JUST PASTED IN.
 *
 * Read live, 24 September 2026, on the second turn of a real setup. She pasted her brief - a
 * thousand characters of it, the whole thing - and was answered:
 *
 *   "This is a detailed brief. You can upload or paste that here so it is kept with what you
 *    shared. Who within each agribusiness will be checking in?"
 *
 * She had. It was in the message being replied to. The prompt line that produces this is a good
 * one - people mention a document and move on, and the product should ask for it - but it has no
 * way to tell "I have a brief" from a brief.
 *
 * IN CODE, BECAUSE THE PROMPT ALREADY SAYS IT. The rule is in the setup prompt now as well, where
 * it is one imperative among dozens. This is the part that cannot be forgotten under load: if their
 * message IS the material, the sentence asking for the material comes out of the reply. Only that
 * sentence - the rest of the turn, including the question it was going to ask next, is untouched.
 */

/** Long enough that it is the thing itself rather than a mention of it. */
export const A_PASTE_IS_AT_LEAST = 400;

export function theyJustPastedSomething(message: string | null | undefined): boolean {
  const text = (message ?? '').trim();
  if (text.length >= A_PASTE_IS_AT_LEAST) return true;
  /* Or a short message that is plainly a list rather than a sentence. */
  return text.split('\n').filter((l) => l.trim()).length >= 4;
}

/** A sentence whose job is to ask for material. */
const ASKS_FOR_THE_MATERIAL =
  /(^|[.!?]\s+)[^.!?]*\b(upload|paste|attach|share (it|that|the (document|brief|notes|file)))\b[^.!?]*[.!?]/gi;

export function withoutAskingForWhatTheyGave(reply: string): string {
  if (!reply) return reply;
  const out = reply.replace(ASKS_FOR_THE_MATERIAL, (m) => {
    /* Keep whatever punctuation and spacing led into the sentence, drop the sentence. */
    const lead = /^([.!?]\s+)/.exec(m);
    return lead ? lead[1] : '';
  });
  const tidied = out.replace(/\s{2,}/g, ' ').trim();
  /*
   * AND NEVER RETURN NOTHING. A reply that was only that sentence becomes empty, and an empty turn
   * is worse than a redundant one - the person types into silence. Where the strip would take the
   * whole reply, the reply stands as it was.
   */
  return tidied.length >= 20 ? tidied : reply;
}

/** What the log says when it fires, so this is visible without reading transcripts. */
export function whatWasStripped(before: string, after: string): string | null {
  if (before === after) return null;
  return `they had just pasted it; took "${before.slice(0, 0)}${before.replace(after, '').trim().slice(0, 120)}" out of the reply`;
}
