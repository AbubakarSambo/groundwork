/**
 * A QUOTE THAT ENDS IN ITS OWN PUNCTUATION TAKES NO SECOND MARK (request 92, point 8).
 *
 * A sentence that closes on somebody's quoted words was written `…"order forms?"?` and
 * `…"I've uploaded it.".`, two marks at the end of one sentence. The words inside the quotes are
 * theirs and are never trimmed; what is left out is the mark the sentence would have added after
 * them, when they end in one of their own.
 */
const ENDS_IN_A_MARK = /[.!?…]["”']?$/;

/** The words in quotation marks, then `mark` only when the words do not already end in one. */
export function quotedThenEnding(words: string, mark: '.' | '?' = '.'): string {
  const w = (words ?? '').trim();
  return `"${w}"${ENDS_IN_A_MARK.test(w) ? '' : mark}`;
}
