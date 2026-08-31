/**
 * WHERE TWO PEOPLE DO NOT AGREE ABOUT AN OBJECTIVE THAT IS NOT WRITTEN YET.
 *
 * If the initiator proposes fourteen days and a contributor says that was never achievable, there
 * are three things a system could do and two of them are wrong:
 *
 *   AVERAGE THEM. Eleven days - a number nobody argued for, which both will now be measured
 *   against, and which is exactly the sort of thing that makes people stop answering honestly.
 *
 *   LET THE FIRST ONE STAND. The initiator typed first, so their version is the draft and the
 *   objection becomes a comment nobody reads. This is what happens in a planning meeting, and it is
 *   the reason objectives miss quietly.
 *
 *   HOLD IT OPEN. The draft carries the disagreement, cannot be finished while it is unresolved,
 *   and the two people have to say which it is. Divergence detection at the moment it is worth the
 *   most - before the objective is set, rather than three months into failing it.
 *
 * The third.
 */
import { overlap } from '../detectors/describing-the-same-goal-differently';

/** Fields where two different answers are a disagreement rather than two contributions. */
export const CONTESTABLE_FIELDS = ['title', 'measure', 'target', 'dueDate'] as const;
export type ContestableField = (typeof CONTESTABLE_FIELDS)[number];

/**
 * Fields that must be settled before a draft is an objective.
 *
 * `title` is deliberately not among them: a working title everybody understands is enough to seed
 * with, and holding a draft hostage over wording is how the mechanism gets a reputation for
 * pedantry. A measure and a target are different - an objective without them is a wish.
 */
export const REQUIRED_TO_FINISH: ContestableField[] = ['measure', 'target'];

export interface Position {
  personExternalId: string;
  body: string;
}

/** Below this, two answers to the same field are different answers rather than different words. */
export const DIFFERENT_BELOW = 0.34;

/**
 * Two positions on one field are a contention when they are actually different answers.
 *
 * Same blunt measure as goal divergence, for the same reason: two people saying the same thing in
 * different words is not a disagreement, and a mechanism that treated it as one would open a
 * contention on every draft anybody touched.
 */
export function isContested(positions: Position[], threshold = DIFFERENT_BELOW): boolean {
  const distinct = new Map<string, string>();
  for (const p of positions) distinct.set(p.personExternalId, p.body);
  const bodies = [...distinct.values()];
  if (bodies.length < 2) return false;

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      if (overlap(bodies[i], bodies[j]) < threshold) return true;
    }
  }
  return false;
}

export interface DraftShape {
  state: 'DRAFTING' | 'GATHERING' | 'CONTESTED' | 'READY' | 'SEEDED' | 'ABANDONED';
  proposedMeasure: string | null;
  proposedTarget: string | null;
  openContentionFields: string[];
}

export type NotReady = { ready: true } | { ready: false; because: string };

/**
 * WHETHER A DRAFT CAN BE FINISHED, AND WHY NOT WHEN IT CANNOT.
 *
 * The reason matters as much as the answer: "not ready" with nothing after it is a dead end, and
 * the person reading it is usually the one who could resolve it.
 */
export function canFinish(d: DraftShape): NotReady {
  if (d.state === 'SEEDED') return { ready: false, because: 'This has already been seeded.' };
  if (d.state === 'ABANDONED') return { ready: false, because: 'This draft was abandoned.' };

  const contestedRequired = d.openContentionFields.filter((f) => (REQUIRED_TO_FINISH as string[]).includes(f));
  if (contestedRequired.length) {
    /*
     * The rule that makes the whole mechanism worth having. A draft with an open disagreement about
     * its measure cannot become an objective by somebody clicking past it.
     */
    return {
      ready: false,
      because: `People do not yet agree on the ${contestedRequired.join(' or the ')}. That has to be settled here rather than after it is set.`,
    };
  }

  if (!d.proposedMeasure?.trim()) return { ready: false, because: 'There is no measure yet - how anybody would know this happened.' };
  if (!d.proposedTarget?.trim()) return { ready: false, because: 'There is no target yet.' };

  return { ready: true };
}

/**
 * What a person reads when a contention opens. Both positions, neither preferred.
 *
 * Naming the FIELD rather than the people: the disagreement is about the objective, and turning it
 * into a disagreement between two named colleagues is how a useful mechanism becomes an argument
 * nobody wants to have in writing.
 */
export function sayContention(field: string, positions: Position[]): string {
  const bodies = [...new Map(positions.map((p) => [p.personExternalId, p.body])).values()];
  return `There are two answers to the ${field} here: "${bodies[0]}" and "${bodies[1]}". `
    + `This cannot be settled by averaging them, and it should not be settled by whoever wrote it first. `
    + `Worth agreeing which it is now, while it is still cheap.`;
}
