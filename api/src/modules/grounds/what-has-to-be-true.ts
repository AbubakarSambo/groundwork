/**
 * WHAT HAS TO BE TRUE FOR AN OBJECTIVE TO BE REACHABLE. (G15, G16, G17, G18, G19)
 *
 * Five items, one idea. Between "here is the goal" and "here are twelve weeks of
 * check-ins" there is a missing middle, and everything in it is a claim about the
 * WORLD rather than about a person:
 *
 *   G15  the conditions that have to hold
 *   G16  whether they actually do, asked at the start rather than discovered later
 *   G17  who the objective depends on, which is not the same as who was invited
 *   G18  what this person needs to know for it to be reachable at all
 *   G19  the distance from here to there, as its own axis
 *
 * WHY THE MIDDLE MATTERS MORE THAN IT SOUNDS. Without it, a ground that fails
 * produces one finding: the person did not get there. With it, the same ground
 * produces the finding that is usually true - the objective needed three things,
 * two of them were never in place, and nobody noticed because nobody had written
 * them down. On Ground 1 the missing condition was somebody saying out loud which
 * of two measures counted; it took seven weeks and it was nobody's fault, because
 * there was no field where it could have been anybody's job.
 *
 * THE LINE THIS MUST NOT CROSS. A condition is about circumstances, not about
 * capability. "A client account is available to hand over" is a condition.
 * "Shows initiative" is a judgement wearing a condition's clothes, and a system
 * that accepts the second becomes a competency framework with extra steps. The
 * distinction is enforced here rather than trusted to whoever types it, and the
 * enforcement is deliberately conservative: it is better to reject a real
 * condition and make somebody rephrase it than to accept one judgement.
 *
 * G19 IS THE ONE PEOPLE WILL MISREAD. The distance from here to the objective is
 * not a score and not a percentage. It is a list of what is still missing, and
 * the useful part is WHOSE it is - because most of the time some of it belongs to
 * the person and some of it belongs to the conditions nobody arranged.
 */

export type ConditionStatus =
  /** Checked at the start and it holds. */
  | 'in place'
  /** Checked and it does not. The most valuable state, and the rarest. */
  | 'not in place'
  /** Named, never checked. Honest, and different from either of the above. */
  | 'unknown';

export interface Condition {
  text: string;
  status: ConditionStatus;
  /** Who arranges it, when anybody has said. Often nobody, which is the finding. */
  ownedByParticipantId?: string | null;
}

/**
 * A condition is about the world. A judgement is about a person.
 *
 * Deliberately blunt and deliberately over-eager. Rejecting a real condition
 * costs somebody a rephrase; accepting one judgement turns the ground into a
 * place where "shows initiative" is a tracked requirement, and there is no way
 * back from that.
 */
const JUDGEMENT = [
  /\b(?:shows?|demonstrates?|displays?|exhibits?)\b/i,
  /\b(?:attitude|mindset|willingness|eagerness|enthusiasm|initiative|proactive|proactivity)\b/i,
  /\b(?:hard[- ]working|reliable|dependable|committed|motivated|coachable|team player)\b/i,
  /\bis (?:a |an )?(?:good|strong|weak|poor|excellent)\b/i,
  /\b(?:capable|competent|incompetent|able) (?:of|to)\b/i,
  /\bfits? in\b/i,
];

export function readsAsAJudgement(text: string): string | null {
  if (!text) return null;
  for (const pattern of JUDGEMENT) {
    const hit = text.match(pattern);
    if (hit) return hit[0];
  }
  return null;
}

/**
 * Why this cannot be a condition, in words somebody can act on.
 *
 * Names the offending phrase and offers the shape of the fix, because "invalid
 * condition" makes people delete the thought rather than restate it - and the
 * thought is usually a real one badly worded.
 */
export function whyThisIsNotACondition(text: string): string | null {
  const hit = readsAsAJudgement(text);
  if (!hit) return null;
  return `"${hit}" is a judgement about a person rather than something that is either true or not. A condition is a fact about the world that somebody could arrange - "a client account is free to hand over" rather than "shows initiative". What would have to be TRUE for this to be possible?`;
}

/**
 * G16. Readiness, asked at the start.
 *
 * The point is not the count. It is that "unknown" is a real answer and is
 * reported as itself: a ground whose conditions were never checked is in a
 * different position from one whose conditions were checked and hold, and
 * collapsing the two is how a report ends up confidently wrong.
 */
export function readinessRead(conditions: Condition[]): {
  inPlace: number;
  notInPlace: number;
  unknown: number;
  line: string;
} {
  const inPlace = conditions.filter((c) => c.status === 'in place').length;
  const notInPlace = conditions.filter((c) => c.status === 'not in place').length;
  const unknown = conditions.filter((c) => c.status === 'unknown').length;

  let line: string;
  if (!conditions.length) {
    line = 'No conditions have been named, so nothing here can tell you whether this was set up to succeed.';
  } else if (notInPlace > 0) {
    line = `${notInPlace} of the ${conditions.length} things this depends on ${notInPlace === 1 ? 'is' : 'are'} not in place.`;
  } else if (unknown > 0) {
    line = `${unknown} of the ${conditions.length} things this depends on ${unknown === 1 ? 'has' : 'have'} not been checked. Not checked is not the same as fine.`;
  } else {
    line = `All ${conditions.length} things this depends on were in place at the start.`;
  }
  return { inPlace, notInPlace, unknown, line };
}

/**
 * G17. Who this depends on, against who was invited.
 *
 * The gap between the two is a finding in its own right, and it is the one that
 * explains most stuck grounds: the objective needed somebody who was never in the
 * room, so twelve weeks of check-ins circled a decision nobody present could make.
 */
export function dependsOnSomebodyNotHere(
  requiredParticipantIds: (string | null | undefined)[],
  presentParticipantIds: string[],
): { missing: number; line: string | null } {
  const present = new Set(presentParticipantIds);
  const named = requiredParticipantIds.filter((id): id is string => !!id);
  const unnamed = requiredParticipantIds.length - named.length;
  const missing = named.filter((id) => !present.has(id)).length;

  if (!missing && !unnamed) return { missing: 0, line: null };

  if (unnamed && !missing) {
    return {
      missing: 0,
      line: `${unnamed} of the things this depends on have nobody's name against them.`,
    };
  }
  return {
    missing,
    line: `${missing} of the people this depends on ${missing === 1 ? 'is' : 'are'} not in this ground${unnamed ? `, and ${unnamed} more ${unnamed === 1 ? 'has' : 'have'} nobody named at all` : ''}.`,
  };
}

/**
 * G19. The distance from here to the objective, as a list rather than a number.
 *
 * WHOSE each piece of it is, is the whole value. A gap that belongs to the
 * conditions is not the same as a gap that belongs to the person, and a product
 * that reports one number lets a reader assume the second - which is the default
 * assumption anyway and the one most often wrong.
 */
export interface GapItem {
  text: string;
  belongsTo: 'the person' | 'the conditions' | 'unclear';
}

export function distanceToObjective(items: GapItem[]): {
  total: number;
  theirs: number;
  conditions: number;
  line: string;
} {
  const theirs = items.filter((i) => i.belongsTo === 'the person').length;
  const conditions = items.filter((i) => i.belongsTo === 'the conditions').length;
  const unclear = items.filter((i) => i.belongsTo === 'unclear').length;

  let line: string;
  if (!items.length) {
    line = 'Nothing is recorded as standing between here and the objective.';
  } else if (conditions && !theirs) {
    line = `Everything still standing in the way is a condition nobody has arranged${unclear ? `, plus ${unclear} it is not clear about` : ''}.`;
  } else if (theirs && !conditions) {
    line = `What is left is ${theirs === 1 ? 'one thing' : `${theirs} things`} for this person to do${unclear ? `, plus ${unclear} it is not clear about` : ''}.`;
  } else {
    line = `${conditions} of the ${items.length} things still in the way are conditions nobody has arranged, and ${theirs} ${theirs === 1 ? 'is' : 'are'} for this person.`;
  }

  return { total: items.length, theirs, conditions, line };
}

/**
 * G18. What somebody needs to know for the objective to be reachable.
 *
 * Recorded as a requirement of the OBJECTIVE, not as a deficiency of the person.
 * "This needs somebody who knows the escalation path, and nobody has taught it"
 * is a fact about an onboarding. "Does not know the escalation path" is a note in
 * a file. Same information, and only the first one gets fixed.
 */
export function learningLine(needed: string[], taught: string[]): string | null {
  const untaught = needed.filter((n) => !taught.some((t) => t.trim().toLowerCase() === n.trim().toLowerCase()));
  if (!needed.length) return null;
  if (!untaught.length) return `All ${needed.length} things this objective needs somebody to know have been covered.`;
  return `${untaught.length} of the ${needed.length} things this objective needs somebody to know ${untaught.length === 1 ? 'has' : 'have'} not been covered by anyone.`;
}
