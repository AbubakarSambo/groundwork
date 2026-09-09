/**
 * A TO-DO IS YOURS.
 *
 * A commitment is to somebody: it follows you into your check-in and a report can say it slipped.
 * A to-do is a note to yourself. Nobody else reads it, nothing weighs it, and the only person who
 * can close it is you. The two are kept in different tables so "buy milk" can never become a
 * promise. This file is the wording and the matching; the rows are written by the service.
 */

export interface AToDo {
  text: string;
  dueSaid: string | null;
}

const WHEN = /\b(?:by|on|before|this|next|end of)\s+(?:the\s+)?(?:mon|tues|wednes|thurs|fri|satur|sun)day\b|\b(?:by|on|before)\s+(?:the\s+)?\d{1,2}(?:st|nd|rd|th)?\b|\b(?:today|tomorrow|tonight|this\s+week|next\s+week|end\s+of\s+(?:the\s+)?(?:week|month|quarter))\b/i;

/** The to-do out of what they said, with their words for when if they gave any. */
export function readToDo(subject: string | undefined): AToDo | null {
  const text = (subject ?? '').trim().replace(/[.!]+$/, '');
  if (text.length < 3) return null;
  const when = WHEN.exec(text);
  return { text, dueSaid: when ? when[0].trim() : null };
}

export function toDoProposal(t: AToDo): string {
  return `On your list: "${t.text}"${t.dueSaid ? ` (${t.dueSaid})` : ''}. Yes to keep it, no to leave it.`;
}

/**
 * WHICH ONE THEY MEAN. Whole-word overlap against the open list; one clear winner closes, two or
 * more tied means asking, none means saying so. Never closes on a guess.
 */
export function whichToDo<T extends { id: string; text: string }>(said: string, open: T[]): { one: T } | { several: T[] } | { none: true } {
  const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 3));
  const want = words(said);
  if (!want.size || !open.length) return { none: true };
  const scored = open
    .map((t) => ({ t, score: [...words(t.text)].filter((w) => want.has(w)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return { none: true };
  const top = scored.filter((x) => x.score === scored[0].score);
  return top.length === 1 ? { one: top[0].t } : { several: top.map((x) => x.t) };
}

export function listToDos(open: { text: string; dueSaid: string | null }[]): string {
  if (!open.length) return 'Nothing on your list. Say "add X to my to-do list" and it goes here. It is yours: nobody else reads it.';
  return [`${open.length} on your list:`, ...open.map((t) => `- ${t.text}${t.dueSaid ? ` (${t.dueSaid})` : ''}`)].join('\n');
}
