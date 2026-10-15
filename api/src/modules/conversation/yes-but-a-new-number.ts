/**
 * "YES, BUT IT'S 45 NOW" IS A YES, AND 45 IS THE NUMBER (week 14, screens request 6c).
 *
 * A document's numbers wait for a yes (see whatTheDocumentWaitsFor). The yes was one pattern: a
 * word of agreement followed by up to forty characters of anything. So "Yes, but it's 45 now"
 * matched as a bare yes, and the document's old number went on the record with the person's own
 * correction thrown away. A longer "yes, but" matched nothing, and nothing was taken at all.
 *
 * Now a yes is read in three ways:
 *   A BARE YES takes the numbers as the document has them.
 *   A YES, BUT WITH ONE NUMBER takes that number in place of the document's, for the one line it
 *   is about: the only line waiting, or the one line whose words the answer uses. When it cannot
 *   tell which line, nothing is written and the person is asked which one.
 *   A YES, BUT WITH NO NUMBER is not a yes to the numbers. Nothing is written; the conversation
 *   carries on as it would with any other answer.
 */

const A_YES = /^(yes|yep|yeah|yup|ok|okay|sure|correct|that is right|thats right|that's right|right|confirmed?|take (it|them|those)|record (it|them|those))\b/i;
const A_BARE_YES = new RegExp(`${A_YES.source}[\\s\\S]{0,40}$`, 'i');
const BUT = /\b(but|except|although|though|only|apart from)\b([\s\S]*)$/i;
const A_NUMBER = /(?<![A-Za-z\d.])(\d[\d,]*(?:\.\d+)?)\s*(k|m|mn|million|thousand)?\b/gi;

/** Whether an answer opens with a word of agreement at all: the cheap check before any read. */
export const startsWithAYes = (said: string): boolean => A_YES.test((said ?? '').trim());

export type WhatTheYesSays =
  | { kind: 'not a yes' }
  | { kind: 'yes' }
  | { kind: 'yes, with a new number'; row: number; target: number }
  | { kind: 'yes, but which one'; target: number };

/** The numbers in some words, read as a person writes them: "45", "45,000", "45k", "1.2m". */
export function theNumbersIn(words: string): number[] {
  return [...words.matchAll(A_NUMBER)].map((m) => {
    const n = Number(m[1].replace(/,/g, ''));
    const unit = (m[2] ?? '').toLowerCase();
    return Math.round(n * (unit === 'k' || unit === 'thousand' ? 1e3 : unit === 'm' || unit === 'mn' || unit === 'million' ? 1e6 : 1));
  }).filter((n) => Number.isFinite(n) && n > 0);
}

export function whatTheYesSays(said: string | null | undefined, waiting: { name: string }[]): WhatTheYesSays {
  const answer = (said ?? '').trim();
  if (!A_YES.test(answer)) return { kind: 'not a yes' };
  const but = answer.match(BUT);
  if (!but) return A_BARE_YES.test(answer) ? { kind: 'yes' } : { kind: 'not a yes' };
  const clause = but[2] ?? '';
  const numbers = theNumbersIn(clause);
  if (numbers.length !== 1) return { kind: 'not a yes' };
  const target = numbers[0];
  if (waiting.length === 1) return { kind: 'yes, with a new number', row: 0, target };
  const lower = clause.toLowerCase();
  const named = waiting
    .map((w, i) => ({ i, words: (w.name ?? '').toLowerCase().split(/[^a-z0-9]+/).filter((x) => x.length >= 3) }))
    .filter((w) => w.words.length && w.words.some((x) => lower.includes(x)));
  return named.length === 1 ? { kind: 'yes, with a new number', row: named[0].i, target } : { kind: 'yes, but which one', target };
}
