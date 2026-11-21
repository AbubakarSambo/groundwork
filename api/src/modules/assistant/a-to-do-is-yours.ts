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

/* A day as people type it, whole or short ("by Friday", "by fri", "on tues"): the same days the date reader reads (when-words-mean-a-date.ts). */
const WHEN = /\b(?:by|on|before|this|next|end of)\s+(?:the\s+)?(?:(?:mon|tues|wednes|thurs|fri|satur|sun)day|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b|\b(?:by|on|before)\s+(?:the\s+)?\d{1,2}(?:st|nd|rd|th)?\b|\b(?:today|tomorrow|tonight|this\s+week|next\s+week|end\s+of\s+(?:the\s+)?(?:week|month|quarter))\b/i;

/** The to-do out of what they said, with their words for when if they gave any. */
export function readToDo(subject: string | undefined, wholeMessage = ''): AToDo | null {
  const text = (subject ?? '').trim().replace(/[.!]+$/, '');
  if (text.length < 3) return null;
  /* When may sit in the subject or after the list: "add the rota to my list by Friday". */
  const when = WHEN.exec(text) ?? WHEN.exec(wholeMessage);
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
  /* "the" is three letters and on every to-do; a match on it closed the wrong one once. */
  const STOP = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'onto', 'our', 'your', 'about']);
  const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w)));
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

/**
 * WHAT IS SAID AFTER THE YES, IN THE PROTOTYPE'S WORDS (screens request 27, suite-todos.txt):
 * "Added to your to-dos for Tuesday: call Lakeside’s buyer." The day is only given where one was
 * said. "By Friday" is a deadline, not the day it is for, so it stays after the to-do as said.
 * The to-do itself is their words, unchanged.
 */
export function addedToYourToDos(t: AToDo): string {
  const when = (t.dueSaid ?? '').trim();
  /* Said once: where the day is already at the end of the to-do, the reply does not say it twice.
     What is kept on their list is untouched. */
  const said = t.text.trim().replace(/[.!]+$/, '');
  const what = when && said.toLowerCase().endsWith(when.toLowerCase()) && said.length > when.length
    ? said.slice(0, said.length - when.length).trim().replace(/[,;]+$/, '')
    : said;
  if (!when) return `I have added "${what}" to your to-dos.`;
  if (/^(?:by|before|end of)\b/i.test(when)) return `I have added "${what}" to your to-dos, ${when}.`;
  return `I have added "${what}" to your to-dos for ${when.replace(/^(?:on)\s+(?:the\s+)?/i, '')}.`;
}
