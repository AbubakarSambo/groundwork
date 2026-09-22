/**
 * A FIRST SESSION HAS NO LAST ONE.
 *
 * Read on a live first conversation, 22 September 2026: "What moved on this since the last update?"
 * and then, closing it, "Nothing has moved since the last update." Said to somebody who had never
 * given one, in the first minute of the first session of a check-in nobody had answered before.
 *
 * The update pack now says this in words, and words are not a guarantee: the whole value of a
 * standing check-in is the difference between two of them, so "since the last one" is the natural
 * thing for a model to reach for, and on the one session where it is false it is also the sentence
 * that tells a person the product has them confused with somebody else.
 *
 * So it comes out in code, on session one only, and the sentence keeps its meaning: what moved on it
 * since the last update becomes what it is at now. Where a sentence is nothing BUT the false
 * reference - "nothing has moved since the last update" - it is cut, the way every other guard here
 * cuts rather than rewrites what it cannot repair.
 */

/* Not global: a /g regex carries lastIndex between calls, and `test` on a shared one skips every
   other match. Each place that needs a global copy makes one. */
const SINCE_THE_LAST = /\s*\b(?:since|from)\s+(?:the\s+)?(?:last|previous)\s+(?:update|one|time|check-?in|session|round|period|week|fortnight|month|quarter)\b/i;
const LAST_TIME_YOU = /\b(?:last\s+time|previously|the\s+last\s+update)\s+you\s+(?:said|told me|gave|named|mentioned)\b/i;

/** Only ever the first session: from the second on, this is the most useful question there is. */
export function aFirstSessionHasNoLastOne(sessionNumber: number | null | undefined): boolean {
  return (sessionNumber ?? 1) <= 1;
}

const sentencesOf = (text: string): string[] => (text ?? '').split(/(?<=[.!?])\s+/).filter((s) => s.trim());

/**
 * The reply with a first session's references to a previous one taken out.
 *
 * @returns the text, and whether anything changed, so the caller can log it the way it logs the
 *   other cuts. Unchanged when nothing matched, or when taking the references out would leave
 *   nothing - the reply then ships as it is, because an empty bubble is worse than a wrong tense.
 */
export function withoutTheLastOne(reply: string, sessionNumber: number | null | undefined): { text: string; changed: boolean } {
  if (!aFirstSessionHasNoLastOne(sessionNumber) || !reply?.trim()) return { text: reply, changed: false };
  if (!SINCE_THE_LAST.test(reply) && !LAST_TIME_YOU.test(reply)) return { text: reply, changed: false };
  const kept: string[] = [];
  let changed = false;
  for (const s of sentencesOf(reply)) {
    /* A recall of what they said last time, in a session where they have said nothing before. */
    if (LAST_TIME_YOU.test(s)) { changed = true; continue; }
    if (!SINCE_THE_LAST.test(s)) { kept.push(s); continue; }
    changed = true;
    /* "Nothing has moved since the last update" is only that reference; there is no sentence under it. */
    if (/^\s*(nothing|no(thing)? (?:has|had)?\s*(?:moved|changed|happened))\b/i.test(s)) continue;
    const without = s.replace(new RegExp(SINCE_THE_LAST.source, 'gi'), '').replace(/\s{2,}/g, ' ').replace(/\s+([?.!,])/g, '$1').trim();
    /* What is left has to be a sentence: "Since the last update?" leaves a question mark. */
    if (without.replace(/[^a-z0-9]/gi, ' ').trim().split(/\s+/).filter(Boolean).length < 3) continue;
    /* "What moved on it?" is a question about nothing; what it is at now is the same question. */
    kept.push(/^what moved on (it|this|that)\??$/i.test(without) ? 'What is that at now?' : without);
  }
  const text = kept.join(' ').trim();
  return text ? { text, changed } : { text: reply, changed: false };
}
