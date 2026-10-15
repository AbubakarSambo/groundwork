/**
 * A REPLY NEITHER HANDS THEIR OWN WORDS BACK, NOR ASKS AND ANSWERS ITSELF (pilots, 13 October 2026, E7).
 *
 * Aisha wrote "I have to go to court now." and read "Getting filings in on time. You have to go to court now.": her
 * earlier answer and her last message, handed back to her as Groundwork's acknowledgement. The guard for an opening that
 * restates somebody reads only messages of three subject words or more, so a short message went straight back. And Brian's
 * first message asked and answered itself: "Last time you were about half done with the reply to the plaintiff's letter.
 * Is that now filed? Understood. What is the expected outcome of that letter, and for whom?"
 *
 * Both are shapes, read in code. A sentence that is one of their own sentences from this check-in, with "I" made "you",
 * comes out. A question followed by an acknowledgement nobody gave ("Understood.", "Got it.") keeps the question and
 * drops what came after it, which is the model answering for them and moving on. People's own words are never changed:
 * a sentence is only ever taken out whole.
 */
const sentences = (t: string): string[] => String(t ?? '').split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
const flat = (t: string): string => t.toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Their sentence as Groundwork would say it back: "I have to go" is "you have to go". */
function asSaidBack(theirs: string): string {
  return flat(theirs)
    .replace(/\bi am\b/g, 'you are').replace(/\bi'm\b/g, "you're").replace(/\bi've\b/g, "you've").replace(/\bi'll\b/g, "you'll")
    .replace(/\bi\b/g, 'you').replace(/\bmy\b/g, 'your').replace(/\bme\b/g, 'you').replace(/\bmine\b/g, 'yours').replace(/\bwe\b/g, 'you').replace(/\bour\b/g, 'your');
}

export function withoutTheirWordsHandedBack(reply: string, theirTurnsThisCheckIn: string[]): string {
  const theirs = new Set<string>();
  for (const turn of theirTurnsThisCheckIn ?? []) {
    for (const s of sentences(turn)) {
      const a = flat(s); const b = asSaidBack(s);
      if (a.split(' ').length >= 3) { theirs.add(a); theirs.add(b); }
    }
  }
  if (!theirs.size) return reply;
  const parts = sentences(reply);
  const kept = parts.filter((s) => /\?\s*$/.test(s) || !theirs.has(flat(s)));
  /* Never leave nothing, and never take out the one question. */
  return kept.length && kept.length !== parts.length ? kept.join(' ') : reply;
}

const AN_ACKNOWLEDGEMENT_NOBODY_GAVE = /^(?:understood|got it|okay|ok|noted|thanks|thank you|right|i see|great|good)\b[.!,]?/i;

export function withoutAnAnswerToItsOwnQuestion(reply: string): string {
  const parts = sentences(reply);
  for (let i = 0; i < parts.length - 1; i++) {
    if (/\?\s*$/.test(parts[i]) && AN_ACKNOWLEDGEMENT_NOBODY_GAVE.test(parts[i + 1])) return parts.slice(0, i + 1).join(' ');
  }
  return reply;
}
