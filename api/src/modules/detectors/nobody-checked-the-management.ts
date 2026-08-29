/**
 * SENSE-CHECKING THE OBJECTIVES THEMSELVES, INCLUDING THE ONES FROM ABOVE.
 *
 * §13 and §14. Everything else in this product examines how work is going; this examines whether the
 * thing being asked for holds together at all - before a quarter is spent finding out.
 *
 * THE PART THAT MATTERS IS §14. Groundwork must not assume management is correct. "Every major
 * scenario tested within five days" is a clear objective and an untested assumption, and the second
 * half is invisible to everyone because the first half sounds decisive. A product that checks
 * contributors' claims and takes the chief executive's on trust is not a fair one, and everybody in
 * it works that out quickly.
 *
 * IT FLAGS, IT DOES NOT REWRITE. Every finding here is a question addressed to whoever set the
 * objective. Silently correcting somebody's management would be both wrong and the fastest way to
 * have the whole thing turned off.
 */
import { ObjectiveKind, ObjectiveScope, ObjectiveCheck, ObjectiveDue } from '@prisma/client';

export type Objective = {
  externalId: string | null;
  personExternalId: string;
  text: string;
  kind: ObjectiveKind | null;
  scope: ObjectiveScope | null;
  check: ObjectiveCheck | null;
  dueKind: ObjectiveDue | null;
  owedToPersonExternalId: string | null;
  seenBySubject: boolean;
};

export type Question = {
  /** What kind of problem, so a caller can route it. */
  kind: 'unmeasurable' | 'no_date' | 'unowned' | 'unseen' | 'arithmetic' | 'duplicate_responsibility';
  /** Whose objective it is about. */
  personExternalId: string | null;
  objectiveExternalIds: string[];
  /** The question, addressed to whoever set it. Never a correction. */
  asks: string;
};

const numbersIn = (s: string): number[] =>
  (s.match(/\b\d{1,6}\b/g) ?? []).map(Number).filter((n) => n > 0);

/**
 * A TARGET THAT CANNOT BE CHECKED IS A HOPE.
 *
 * Not a criticism of the objective - plenty of good ones are judgements. It is a question about
 * which kind this is, asked now rather than at the end of the quarter when the disagreement about
 * whether it was met is unresolvable.
 */
export function unmeasurable(objectives: Objective[]): Question[] {
  return objectives
    .filter((o) => o.kind === ObjectiveKind.TARGET && o.check !== ObjectiveCheck.A_NUMBER && !numbersIn(o.text).length)
    .map((o) => ({
      kind: 'unmeasurable' as const,
      personExternalId: o.personExternalId,
      objectiveExternalIds: [o.externalId ?? ''],
      asks: `"${o.text}" is recorded as a target, which usually means a number crosses a line. What number, and who reads it?`,
    }));
}

/** A deadline that exists in somebody's head and nowhere else. */
export function noDate(objectives: Objective[]): Question[] {
  return objectives
    .filter((o) => o.kind === ObjectiveKind.TARGET || o.kind === ObjectiveKind.COMMITMENT)
    .filter((o) => !o.dueKind || o.dueKind === ObjectiveDue.NOT_SAID)
    .map((o) => ({
      kind: 'no_date' as const,
      personExternalId: o.personExternalId,
      objectiveExternalIds: [o.externalId ?? ''],
      asks: `"${o.text}" has no date on it. By when, and does everybody waiting on it know that date?`,
    }));
}

/** A commitment somebody is waiting on, with nobody recorded as waiting. */
export function unowned(objectives: Objective[]): Question[] {
  return objectives
    .filter((o) => o.kind === ObjectiveKind.COMMITMENT && !o.owedToPersonExternalId)
    .map((o) => ({
      kind: 'unowned' as const,
      personExternalId: o.personExternalId,
      objectiveExternalIds: [o.externalId ?? ''],
      asks: `"${o.text}" is a commitment, so somebody is waiting on it. Who, and do they know?`,
    }));
}

/**
 * SOMEBODY IS BEING HELD TO SOMETHING THEY HAVE NOT SEEN.
 *
 * The plainest fairness failure available, and the easiest to create by accident: an objective
 * pushed from a planning system that nobody ever showed the person it is about.
 */
export function unseen(objectives: Objective[]): Question[] {
  return objectives
    .filter((o) => !o.seenBySubject && (o.kind === ObjectiveKind.TARGET || o.kind === ObjectiveKind.COMMITMENT))
    .map((o) => ({
      kind: 'unseen' as const,
      personExternalId: o.personExternalId,
      objectiveExternalIds: [o.externalId ?? ''],
      asks: `Has "${o.text}" been shown to the person it is about? Nothing here will read them against it until it has.`,
    }));
}

/**
 * THE SIX-EACH VERSUS TEN-COLLECTIVE PROBLEM, WHICH IS THE ONE FROM THE BRIEF.
 *
 * Several people each holding an individual number, alongside a collective number for the same
 * thing, where the individuals do not add up to the collective. Both may be deliberate - one is a
 * stretch and one is the commitment - and that is exactly what makes it worth asking rather than
 * assuming. Nobody notices it in a planning meeting because the two numbers are said an hour apart.
 */
export function arithmetic(objectives: Objective[]): Question[] {
  const individuals = objectives.filter(
    (o) => o.scope !== ObjectiveScope.WHOLE_CHECK_IN && o.kind === ObjectiveKind.TARGET && numbersIn(o.text).length,
  );
  const collective = objectives.filter(
    (o) => o.scope === ObjectiveScope.WHOLE_CHECK_IN && numbersIn(o.text).length,
  );
  if (!collective.length || individuals.length < 2) return [];

  const out: Question[] = [];
  for (const c of collective) {
    const target = Math.max(...numbersIn(c.text));
    const sum = individuals.reduce((n, o) => n + Math.max(...numbersIn(o.text)), 0);
    if (sum === target) continue;
    out.push({
      kind: 'arithmetic',
      /* Nobody's, deliberately. This is about two objectives disagreeing, and attaching it to a
         person would make a question about the plan read as a question about them. */
      personExternalId: null,
      objectiveExternalIds: [c.externalId ?? '', ...individuals.map((o) => o.externalId ?? '')],
      asks: `The individual targets add up to ${sum}, and the shared one is ${target}. Are these measuring different things, or is one of them the wrong number?`,
    });
  }
  return out;
}

/** Two people holding what reads as the same responsibility. */
export function duplicateResponsibility(objectives: Objective[]): Question[] {
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/).filter((w) => w.length >= 4).sort().join(' ');
  const byShape = new Map<string, Objective[]>();
  for (const o of objectives.filter((x) => x.kind === ObjectiveKind.ROLE_EXPECTATION || x.kind === ObjectiveKind.COMMITMENT)) {
    const k = norm(o.text);
    if (!k) continue;
    (byShape.get(k) ?? byShape.set(k, []).get(k)!).push(o);
  }
  return [...byShape.values()]
    .filter((group) => new Set(group.map((o) => o.personExternalId)).size > 1)
    .map((group) => ({
      kind: 'duplicate_responsibility' as const,
      personExternalId: null,
      objectiveExternalIds: group.map((o) => o.externalId ?? ''),
      asks: `${group.length} people are recorded with what looks like the same responsibility: "${group[0].text}". Is that shared on purpose, or does one of them own it?`,
    }));
}

/**
 * Everything, in the order somebody would want to fix it.
 *
 * Fairness first - somebody held to an unseen standard is the one with a person on the wrong end of
 * it. Then the things that make a quarter unresolvable at its end.
 */
export function senseCheck(objectives: Objective[]): Question[] {
  return [
    ...unseen(objectives),
    ...unowned(objectives),
    ...arithmetic(objectives),
    ...duplicateResponsibility(objectives),
    ...unmeasurable(objectives),
    ...noDate(objectives),
  ];
}
