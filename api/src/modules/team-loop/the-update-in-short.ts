/**
 * THE FRIDAY EMAIL AND THE WEEKLY UPDATE, KEPT SHORT (Ebele round 2, E3). Round 2's email gave every promise, eight lines of "Musa stated on November 12 that...",
 * and left her to find what mattered. This keeps the same facts and the same sources, and decides only how many are told: at most MOST_TOLD, taken so that every person
 * who sent something is in it before anybody is in it twice, with the rest counted by code ("3 more are on the list, and I can read them out if you ask", the same
 * words the outstanding answer uses). The model, when there is one, writes the sentences from the facts it is handed (the-update-for-her.ts); the count is never its.
 * With no model the shown facts are told plainly, grouped by person.
 */
import type { AFact } from './the-team-mind';

export const MOST_TOLD = 10;

/** The facts to tell, one from each person before a second from anybody, and how many were left out. Order inside a person is kept. */
export function theFactsToTell(facts: { person: string; fact: AFact }[], most = MOST_TOLD): { shown: { person: string; fact: AFact }[]; left: number } {
  const byPerson = new Map<string, { person: string; fact: AFact }[]>();
  for (const f of facts) byPerson.set(f.person, [...(byPerson.get(f.person) ?? []), f]);
  const queues = [...byPerson.values()];
  const picked: { person: string; fact: AFact }[] = [];
  for (let round = 0; picked.length < most && queues.some((q) => q[round]); round += 1) for (const q of queues) if (q[round] && picked.length < most) picked.push(q[round]);
  /* Told in the order the record has them, so a person's lines stay together and in the order they were said. */
  const shown = facts.filter((f) => picked.includes(f));
  return { shown, left: facts.length - shown.length };
}

export const AND_MORE_ARE_ON_THE_LIST = (n: number): string => `${n} more ${n === 1 ? 'is' : 'are'} on the list, and I can read ${n === 1 ? 'it' : 'them'} out if you ask.`;

/** The paragraphs for the facts: the model's sentences when it gave safe ones, else the facts told plainly by person; then the count of what was left out. */
export function theUpdateParagraphs(shown: { person: string; fact: AFact }[], left: number, narrated: { says: string; from: string[] }[] | null | undefined): string[] {
  const out: string[] = [];
  let notMentioned = left;
  if (narrated?.length) {
    out.push(narrated.map((s) => s.says.trim()).join(' '));
    const covered = new Set(narrated.flatMap((s) => s.from));
    notMentioned += shown.filter((f) => !covered.has(f.fact.id)).length;
  } else {
    for (const p of [...new Set(shown.map((f) => f.person))]) out.push(shown.filter((f) => f.person === p).map((f) => f.fact.says).join(' '));
  }
  if (notMentioned > 0) out.push(AND_MORE_ARE_ON_THE_LIST(notMentioned));
  return out;
}
