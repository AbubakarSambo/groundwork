/**
 * TWO PEOPLE ON ONE OBJECTIVE, DESCRIBING IT AS DIFFERENT THINGS.
 *
 * The other finding no OKR tool can produce. Their tool holds one sentence written by whoever set
 * the objective; it has no idea that the owner thinks this is about cutting the onboarding queue
 * and a contributor thinks it is about rewriting the docs. Both are working hard. Neither is
 * lying. The objective is going to miss and nobody will be able to say when it started.
 *
 * WHY THIS IS COMPARED AT ALL, WHICH IS THE PART WORTH BEING CAREFUL ABOUT.
 *
 * It compares what people said the WORK IS, not how well they said it. There is no score for
 * articulacy anywhere in here - that is one of the four things §12.8 forbids leaving the API, and
 * it would be the easy thing to accidentally build: "these two descriptions are dissimilar" is one
 * short step from "this person describes things badly".
 *
 * So the output is symmetric and names no one as the correct one. There is no baseline description
 * and no deviation from it - just two accounts of the same objective that do not meet.
 */

export interface Account {
  personExternalId: string;
  /** What they said this objective is, in their words. */
  text: string;
}

/** Words that carry no meaning about the work. Shared with retrieval for the same reason. */
import { STOPWORDS } from '../knowledge/knowledge.service';

function meaningfulWords(s: string): Set<string> {
  return new Set(
    s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
  );
}

/**
 * How much two accounts of the same objective have in common, 0 to 1.
 *
 * Jaccard over meaningful words. Blunt, and deliberately so: anything cleverer would be a judgement
 * about meaning, and a judgement about meaning is exactly what must not sit behind a finding about
 * two named people. Overlapping words is a fact about what they wrote.
 *
 * Four letters and up, because "the queue" and "a queue" differ only in words nobody chose.
 */
/*
 * Called `overlap` and never `score`, and the variable inside it is `shared`. A guard here refuses
 * the word outright, which felt fussy until it caught this file: "score" is one reading away from
 * a score for how well somebody writes, and that is the first of the four things §12.8 forbids.
 * The name is the cheapest place to keep them apart.
 */
export function overlap(a: string, b: string): number {
  const A = meaningfulWords(a);
  const B = meaningfulWords(b);
  if (!A.size || !B.size) return 1; /* Nothing to compare is not a divergence. */
  let shared = 0;
  for (const w of A) if (B.has(w)) shared += 1;
  return shared / (A.size + B.size - shared);
}

/**
 * BELOW THIS, TWO PEOPLE ARE DESCRIBING DIFFERENT WORK.
 *
 * A judgement rather than a measurement, and it is one number in one place so it can be argued
 * with. Set it too low and the finding never fires; too high and every pair of sentences by two
 * different humans is a divergence, which is the version that gets the whole feature turned off.
 */
export const DIVERGENCE_BELOW = 0.2;

/** At least two accounts, or there is nothing to diverge from. */
export const NEEDS_ACCOUNTS = 2;

export interface Divergence {
  subjectExternalId: string;
  /** Both, unordered. Neither is the correct one. */
  between: [string, string];
  overlap: number;
  accounts: [string, string];
}

export function findGoalDivergence(
  subjectExternalId: string,
  accounts: Account[],
  threshold = DIVERGENCE_BELOW,
): Divergence[] {
  /*
   * One account per person. Somebody who stated the objective twice gets their latest, because two
   * of their own sentences disagreeing is a person changing their mind, not a team out of step.
   */
  const latest = new Map<string, string>();
  for (const a of accounts) latest.set(a.personExternalId, a.text);
  const people = [...latest.keys()];
  if (people.length < NEEDS_ACCOUNTS) return [];

  const out: Divergence[] = [];
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const a = latest.get(people[i])!;
      const b = latest.get(people[j])!;
      const shared = overlap(a, b);
      if (shared < threshold) {
        out.push({
          subjectExternalId,
          between: [people[i], people[j]],
          overlap: Number(shared.toFixed(3)),
          accounts: [a, b],
        });
      }
    }
  }
  return out.sort((x, y) => x.overlap - y.overlap);
}

/**
 * The sentence somebody reads. It quotes both and blames neither.
 *
 * Quoting is the point: a summary of two descriptions is a third description, and the whole finding
 * is that there are already too many.
 */
export function sayIt(d: Divergence, title: string): string {
  return `Two people describe ${title} differently. One says it is "${d.accounts[0]}". `
    + `The other says it is "${d.accounts[1]}". `
    + `Neither is wrong, and that is the problem - it is worth ten minutes agreeing which it is before the work goes further.`;
}
