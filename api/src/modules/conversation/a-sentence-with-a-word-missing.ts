/**
 * A SENTENCE THAT LOST A WORD ON THE WAY OUT.
 *
 * Photographed in a live transcript: "every we discuss is to help you build a clear, honest record
 * of your work." The model wrote "everything", or meant to, and a noun went missing between the
 * model and the record. Saved that way, it is the product looking broken on the one screen that is
 * supposed to be careful with words.
 *
 * A general grammar check is not the job here and would refuse good sentences. This looks for one
 * shape, the one that actually happened: a determiner or quantifier standing immediately before a
 * pronoun, which is not English and is what a dropped noun leaves behind. Anything it catches is
 * asked for again, once, through the machinery the invention gate already uses.
 */
const A_WORD_IS_MISSING = /\b(?:the|a|an|every|each|this|that|these|those|some|any|another)\s+(?:i|we|you|he|she|they|it)\b/i;

export function readsAsBroken(reply: string): boolean {
  if (!reply?.trim()) return false;
  /* "that I said" and "this I mentioned" are relative clauses and ordinary English; the shape only
     reads as broken at the start of a clause, so the test is run per sentence against its opening. */
  for (const sentence of reply.split(/(?<=[.!?])\s+/)) {
    const s = sentence.trim();
    if (!s) continue;
    const m = A_WORD_IS_MISSING.exec(s);
    if (!m) continue;
    /* A relative clause has something in front of it inside the same clause. A dropped noun leaves
       the shape at the very start of the sentence or straight after a comma or a conjunction. */
    const before = s.slice(0, m.index).trim();
    if (before === '' || /[,;:]$|\b(?:and|but|so|because|that|which)$/i.test(before)) return true;
  }
  return false;
}

export const ASK_FOR_IT_AGAIN_PLAINLY =
  'Your last reply had a sentence with a word missing from it. Say the same thing again, as whole sentences.';
