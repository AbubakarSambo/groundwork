/**
 * A LINE OF THE RECORD PASTED INTO A SENTENCE IS NEVER SENT (messages test, fourth run). Kevin's WhatsApp check-in, Tuesday 13 October:
 *
 *   "They shut you down before you could offer a price. That means your entry from last session-Selling 120 units would mean you've
 *    successfully closed deals for that many water dispensers. The sales reports would show it.-no longer stands for this specific
 *    deal. Is that accurate?"
 *
 * The model put a whole line of his record between two hyphens, joined to the words around it with no space. That is never his words
 * read back and never a sentence. Read on what is sent: from the sentence where a word runs into a capital with a hyphen
 * ("session-Selling") to the one where a full stop runs into a small letter with a hyphen ("it.-no"), the sentences go. A question that only
 * asks whether that is accurate goes with them; what is left stands.
 */
import { intoSentences } from './nothing-invented-reaches-them';

const STARTS = /[a-z]-[A-Z]/;
const ENDS = /[.!?]-[a-z]/;
const IS_THAT_RIGHT = /^\s*(?:is that (?:accurate|right|correct)|is that so|right)\?\s*$/i;

export function withoutAPastedLine(reply: string): { text: string; cut: string[] } {
  if (!reply || !STARTS.test(reply) || !ENDS.test(reply)) return { text: reply, cut: [] };
  const sentences = intoSentences(reply);
  const from = sentences.findIndex((s) => STARTS.test(s));
  if (from < 0) return { text: reply, cut: [] };
  /* The end is a sentence with ".-no" in it, or the one before a sentence that opens "-no". */
  const to = sentences.findIndex((s, i) => i >= from && (ENDS.test(s) || /^-[a-z]/.test(sentences[i + 1] ?? '')));
  if (to < 0) return { text: reply, cut: [] };
  let end = ENDS.test(sentences[to]) ? to : to + 1;
  if (sentences[end + 1] && IS_THAT_RIGHT.test(sentences[end + 1])) end += 1;
  const cut = sentences.slice(from, end + 1).map((s) => s.trim());
  const text = [...sentences.slice(0, from), ...sentences.slice(end + 1)].join('').replace(/[ \t]{2,}/g, ' ').trim();
  return { text, cut };
}
