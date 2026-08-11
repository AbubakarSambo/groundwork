/**
 * TAKE THE COURTROOM OUT OF THE SENTENCE.
 *
 * Nine of ten observations on a real ground opened the same way:
 *
 *   "The record shows a confident statement about performance that is not
 *    substantiated with specifics when questioned."
 *   "The record describes a six-week period of work against a goal that is now
 *    described as no longer relevant."
 *   "The record contains high-level, positive statements, but avoids specifics."
 *
 * Read one and it is fine. Read ten in a column and it is disclosure in a court
 * case, which is precisely what this product is not: a shared picture of how
 * work is going, not evidence assembled against somebody. The reader already
 * knows it comes from the record. Saying so every time adds nothing except
 * distance, and distance is the thing that makes a person feel written about
 * rather than talked to.
 *
 * The prompt now asks for plain sentences, but a prompt is a request, not a
 * guarantee - and voice is the one thing that cannot be enforced structurally,
 * because there is no way to check a tone in code. What CAN be done in code is
 * this exact opener, which is deterministic: strip the announcement and keep the
 * sentence.
 *
 * Deliberately narrow. It only removes a leading "the record <verb> [that]" and
 * fixes the capital left behind. It does not paraphrase, reorder, or touch the
 * middle of a sentence, because a rewrite that changes meaning in an
 * accountability record would be far worse than a stiff sentence.
 */

const OPENERS = [
  /^the record (?:shows|show|showed|describes|described|contains|contained|indicates|indicated|reflects|reflected|notes|noted|suggests|suggested)\s+(?:that\s+)?/i,
  /^(?:both|all) records? (?:show|shows|describe|describes|contain|contains|indicate|indicates)\s+(?:that\s+)?/i,
  /^this record (?:shows|describes|contains)\s+(?:that\s+)?/i,
];

export function plainVoice(text: string): string {
  if (!text) return text;
  let out = text.trim();

  for (const opener of OPENERS) {
    const stripped = out.replace(opener, '');
    if (stripped !== out) {
      out = stripped;
      break;   // one announcement per sentence is all there ever is
    }
  }

  if (out === text.trim()) return text;

  // A stripped opener leaves a lower-case first letter mid-sentence-looking.
  // "a confident statement..." reads as a fragment; "A confident statement..."
  // reads as a sentence.
  if (out.length > 0) out = out[0].toUpperCase() + out.slice(1);
  return out;
}
