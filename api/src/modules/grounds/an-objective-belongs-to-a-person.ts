/**
 * AN OBJECTIVE BELONGS TO A PERSON, AND A BASELINE BELONGS TO A DATE. (G13, G14)
 *
 * These are one piece of work because they are one absence. A ground holds one
 * success definition, it belongs to the lead, and there is no record of where
 * anything stood on day one. Everything else in Wave 3 - conditions, readiness,
 * who is required, what needs learning, the gap as its own axis - is measured
 * against one or the other, so neither can be built second.
 *
 * WHAT G13 ACTUALLY FIXES, from a real run. Ground 1's report closed on this:
 *
 *   "I was measured on a queue and judged on judgement, and only one of those
 *    was said."
 *
 * The hire never had an objective of his own, so he inferred one from the only
 * number anybody had named. That is not a communication failure, it is a MISSING
 * FIELD: nowhere in the system was there a place for "what success looks like for
 * this person, stated to this person". With one, the week-one report can show
 * that his objective and hers do not connect - which is the entire finding,
 * eleven weeks early.
 *
 * WHAT G14 FIXES. "Why now" is captured; "where this stands today" is not. Without
 * a baseline a report can only show where accounts differ from EACH OTHER, never
 * distance travelled. The arc is the core value of the product and it is
 * currently inferred from session 1 by accident rather than recorded on purpose -
 * which means the first session is doing two jobs and doing the second badly.
 *
 * THE RULE THAT KEEPS THIS FROM BECOMING A PERFORMANCE SYSTEM. An objective is
 * something a person is trying to achieve, in their words, and it is NEVER a
 * target somebody else sets for them and scores them against. So:
 *
 *   the lead may propose one, and the person may rewrite it;
 *   until the person has seen it, it is a proposal and reads as one;
 *   the report shows whether two objectives CONNECT, never who is achieving
 *   more of theirs.
 *
 * Every one of those is arithmetic here rather than an instruction, for the
 * reason two prompt-only guardrails on this product leaked in a single day.
 */

export type ObjectiveState =
  /** The lead has written something for this person. They have not seen it. */
  | 'proposed'
  /** The person has read it and left it as it stands. */
  | 'accepted'
  /** The person wrote or rewrote it. The strongest version. */
  | 'their own'
  /** Nobody has said what success looks like for this person. */
  | 'none';

export interface PersonObjective {
  participantId: string;
  text: string | null;
  /** Who wrote the current text. */
  authoredBy: 'lead' | 'self' | null;
  /** Whether the person it belongs to has seen the current text. */
  seenBySubject: boolean;
}

export function objectiveState(o: PersonObjective | null | undefined): ObjectiveState {
  if (!o?.text?.trim()) return 'none';
  if (o.authoredBy === 'self') return 'their own';
  return o.seenBySubject ? 'accepted' : 'proposed';
}

/**
 * May this objective be used as the thing somebody is read against?
 *
 * Not while it is a proposal. Reading a person against a target they have never
 * seen is the definition of an unfair review, and the fact that the product
 * would be doing it silently makes it worse rather than better.
 *
 * "none" is also false, and that matters as much: where nobody has said what
 * success looks like, the honest output is no read at all. The board already
 * takes this position on remits - "an undefined role is often the real problem,
 * not the person" - and this is the same sentence about objectives.
 */
export function mayBeReadAgainst(o: PersonObjective | null | undefined): boolean {
  const state = objectiveState(o);
  return state === 'accepted' || state === 'their own';
}

/**
 * How an objective must be described wherever it is shown.
 *
 * The state travels with the text, always, because "your objective is X" and
 * "your manager has suggested X and you have not replied" are different
 * statements and the difference is the whole point.
 */
export function describeObjective(o: PersonObjective | null | undefined): string {
  switch (objectiveState(o)) {
    case 'their own':
      return `${o!.text} (in their own words)`;
    case 'accepted':
      return `${o!.text} (proposed by the person leading this, and left as it stands)`;
    case 'proposed':
      return `${o!.text} (proposed, and not yet seen by the person it is for)`;
    case 'none':
      return 'Nobody has said what success looks like for this person.';
  }
}

/**
 * DO TWO OBJECTIVES CONNECT?
 *
 * The question the product is allowed to ask. Not whose is better, not who is
 * further along - whether achieving one would move the other.
 *
 * Returns null where it cannot tell, which is most of the time and is the honest
 * answer: this is a real comparison for a person to make, not something to
 * infer from word overlap. What this function does is decide whether the
 * comparison may be ATTEMPTED at all, so nothing downstream tries it on a
 * proposal or on an absence.
 */
export function mayCompare(a: PersonObjective | null, b: PersonObjective | null): {
  can: boolean;
  reason: string;
} {
  if (!mayBeReadAgainst(a) || !mayBeReadAgainst(b)) {
    const missing = [
      mayBeReadAgainst(a) ? null : objectiveState(a),
      mayBeReadAgainst(b) ? null : objectiveState(b),
    ].filter(Boolean);

    return {
      can: false,
      reason: missing.includes('none')
        ? 'one of these people has no objective of their own, so there is nothing to connect - which is usually the finding rather than a gap in the data'
        : 'one of these objectives is still a proposal nobody has seen, and a proposal cannot be compared to a commitment',
    };
  }
  return { can: true, reason: '' };
}

/**
 * THE BASELINE. (G14)
 *
 * Where this stood on day one, recorded on purpose rather than inferred from
 * session 1. Frozen: a baseline that moves is not a baseline, and the temptation
 * to "correct" it later is exactly how a record stops being able to show that
 * anything changed.
 */
export interface Baseline {
  /** What was true at the start, in the words of whoever set the ground up. */
  text: string;
  capturedAtSession: number;
  /** Deliberately no updatedAt. See freezeReason. */
}

/**
 * Why a baseline cannot be edited, kept next to the type so nobody has to guess.
 *
 * Somebody will want to. The first session usually reveals that the day-one
 * description was wrong, and fixing it feels like accuracy. It is the opposite:
 * the value of a baseline is that it records what people BELIEVED at the start,
 * and half the findings this product produces are the difference between that
 * and what turned out to be true. Corrected, it becomes a second description of
 * the present and the arc disappears.
 *
 * A correction goes in as a new entry with its own date. Nothing is lost and the
 * distance stays measurable.
 */
export const BASELINE_IS_FROZEN =
  'The starting point is kept as it was written, even where it turns out to have been wrong. What people believed at the start is half of what this record is for.';

/** Can this ground show movement rather than only position? */
export function canShowMovement(baseline: Baseline | null | undefined, completedSessions: number): boolean {
  return !!baseline?.text?.trim() && completedSessions >= 2;
}
