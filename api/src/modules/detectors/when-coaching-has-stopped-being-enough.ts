/**
 * WHEN LIGHT COACHING HAS STOPPED BEING ENOUGH.
 *
 * The moment this product exists to catch, and the one it must be most careful about. A person is
 * nervous about something, gets a small step, does not manage it, gets a smaller step, does not
 * manage that either. Three sessions in, nothing has changed and nothing about the situation
 * explains why.
 *
 * Everything before this point handles that badly in the same way: each session treats it as a
 * fresh conversation, so three weeks of the same thing read as three unrelated weeks and nobody
 * ever decides anything.
 *
 * IT RECOMMENDS A CONVERSATION. It does not decide anything, it is not a warning, it is not a
 * disciplinary step, and it never says somebody is failing. The most it says is that the normal
 * cycle has been tried and has not moved this, and that a person should now talk to them - which
 * is the thing a manager is for.
 *
 * EVERY CONDITION HAS TO HOLD, and each one exists to stop a different unfairness:
 *
 *   Repetition, because once is a week and twice is a fortnight.
 *   They have seen it, because nobody can be behind on something never shown to them.
 *   Nothing in the way, because a blocker is the manager's job before it is the person's.
 *   Coaching was actually offered, because escalating past a step nobody ever gave is not
 *     escalation, it is skipping the part that helps.
 *
 * Miss any one and this says nothing at all, which is the answer almost every time.
 */

export interface HowItHasGone {
  /** What was promised, in their words. Quoted, never rewritten. */
  what: string;
  /** How many separate check-ins this has been outstanding across. */
  periods: number;
  /** Whether the person has seen the expectation. */
  seen: boolean;
  /** Open blockers they have recorded against it. */
  blockers: number;
  /** Coaching steps offered about this, and how many they managed. */
  stepsOffered: number;
  stepsManaged: number;
}

/** Below this it is a fortnight, not a pattern. The same bar the behavioural engine already sets. */
export const PERIODS_BEFORE_A_CONVERSATION = 3;

export type Escalation =
  | { recommend: false; because: string }
  | { recommend: true; says: string };

export function hasCoachingRunOut(how: HowItHasGone, who?: string | null): Escalation {
  if (how.periods < PERIODS_BEFORE_A_CONVERSATION) {
    return { recommend: false, because: 'this has not been outstanding long enough to be a pattern.' };
  }
  if (!how.seen) {
    /* The unfairest possible escalation: nobody showed them the thing. */
    return { recommend: false, because: 'they have not been shown this, so there is nothing to escalate.' };
  }
  if (how.blockers > 0) {
    /* Something is in the way, and clearing it is the manager's job before it is anybody's failing. */
    return { recommend: false, because: 'something is recorded as blocking this, which is a different conversation.' };
  }
  if (how.stepsOffered === 0) {
    /* Escalating past a step nobody gave is skipping the part that helps. */
    return { recommend: false, because: 'no coaching step has been offered on this yet, so the normal cycle has not been tried.' };
  }
  if (how.stepsManaged > 0) {
    /* Something moved. Slower than hoped is not the same as stuck. */
    return { recommend: false, because: 'some of what was suggested has been managed, so this is moving rather than stuck.' };
  }

  return {
    recommend: true,
    /* With their name where the caller has it, and no dash join (3 October 2026). */
    says: `"${how.what}" has been outstanding across ${how.periods} check-ins. ${who?.trim() || 'They'} ${who?.trim() ? 'has' : 'have'} seen it, `
      + `nothing has been recorded as blocking it, and ${how.stepsOffered === 1 ? 'a smaller step was' : `${how.stepsOffered} smaller steps were`} `
      + 'suggested without moving it. That is the ordinary cycle having been tried, which is worth '
      + 'twenty minutes with them rather than another check-in question. What is behind it is still '
      + 'an open question. This says the conversation is yours now, not what the answer is.',
  };
}
