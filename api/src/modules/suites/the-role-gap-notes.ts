import { createHash } from 'crypto';
import { aSentenceTheRecordSupports } from '../grounds/the-company-picture';

/**
 * WHY A JOB NOBODY OWNS MATTERS (request 25, the role map, U.17), in one plain sentence.
 *
 * Built from the record when it changes, never when the map is opened. The record is a handoff a
 * person raised in a check-in, waiting on something that is the work of a role nobody holds, such as
 * a person who waited three weeks for freezers while nobody owned stock planning. It is never built
 * from a person's private report, and never from what anybody asked Ask Groundwork.
 *
 * NO MODEL WRITES IT. The sentence is put together here from the record alone, so every name and
 * number in it is one the record gave, and it is checked again before it is kept: no number that is
 * not the wait, no name, no label, no score, no ranking. The person is stored as the check-in's own
 * label for them ("participant A"), never a name; the name goes back in only when an admin who may
 * open that check-in reads the map, through the wrapper the reports use.
 */

export interface AWaitOnAJobNobodyHolds {
  roleName: string;
  groundId: string;
  /** The check-in's own label for the person who waited, for example "participant A". */
  label: string;
  /** What they waited for, in their own words, as the record has it. */
  what: string;
  weeks: number;
  /** The wait ended. */
  ended: boolean;
}

const WEEKS_IN_WORDS = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

export const weeksSaid = (n: number) => `${n <= 12 ? WEEKS_IN_WORDS[n] : n} ${n === 1 ? 'week' : 'weeks'}`;

const withoutStops = (s: string) => s.trim().replace(/[.!?;,\s]+$/, '');

/** What somebody waited for, fit to sit inside a sentence, or null when it is not. */
export function whatWasWaitedFor(said: string | null | undefined, names: string[]): string | null {
  const t = withoutStops((said ?? '').replace(/\s+/g, ' '));
  if (t.length < 3 || t.length > 80) return null;
  if (/["“”«»:]|->|→/.test(t) || /@/.test(t)) return null;
  const low = t.toLowerCase();
  if (names.some((n) => n.length >= 3 && new RegExp(`(^|[^a-z])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(low))) return null;
  return t;
}

/**
 * The sentence, or null when it does not pass. The label stands in for a person in the sentence, and
 * is stood in for by the word "someone" while it is checked, so a stray name anywhere else is caught.
 */
export function theSentenceFor(w: AWaitOnAJobNobodyHolds, names: string[]): string | null {
  const says = `That is why ${w.label} ${w.ended ? 'waited' : 'has been waiting'} ${weeksSaid(w.weeks)} for ${w.what}.`;
  const ok = aSentenceTheRecordSupports(says.replace(w.label, 'someone'), { allowedNumbers: [w.weeks], names, sources: [], min: 20, max: 200 });
  if (!ok) return null;
  if (/\b(score[sd]?|rating|rated|pip|exit|at[- ]risk|low[- ]performer)\b/i.test(says)) return null;
  return says;
}

/** One note per role: the longest wait the record shows, so the sentence is about the thing that cost most. */
export function notesFrom(waits: AWaitOnAJobNobodyHolds[], names: string[]): { roleName: string; groundId: string; says: string }[] {
  const best = new Map<string, AWaitOnAJobNobodyHolds>();
  for (const w of waits) {
    if (w.weeks < 1) continue;
    const k = w.roleName.trim().toLowerCase();
    const had = best.get(k);
    if (theSentenceFor(w, names) && (!had || w.weeks > had.weeks)) best.set(k, w);
  }
  return [...best.values()]
    .sort((a, b) => a.roleName.localeCompare(b.roleName))
    .map((w) => ({ roleName: w.roleName, groundId: w.groundId, says: theSentenceFor(w, names)! }));
}

export const theKeyOf = (notes: { roleName: string; groundId: string; says: string }[]) =>
  createHash('sha256').update(JSON.stringify(notes)).digest('hex').slice(0, 16);
