/**
 * SIX WAYS TO BE BLOCKED, AND THEY ARE NOT THE SAME PROBLEM.
 *
 * A handoff knew who was waiting on whom and never what for, so "we cannot ship because hardware is
 * delayed" and "both parts exist and the integration fails" and "this was known four weeks ago and
 * nobody raised it" all read identically: one person waiting on another. The argument was then
 * settled by whoever described it most convincingly, which is the failure this product exists to
 * stop everywhere else.
 *
 * WHAT EACH ONE CHANGES IS WHO CAN ACT. That is the whole reason to tell them apart - not to file
 * the blocker better, but because a decision nobody has made needs a different person in the room
 * from a rig nobody can book.
 *
 * SAID BY THE PERSON WAITING, NEVER INFERRED. `SEEN_COMING` is the one that says something about
 * how work was managed, and it is the one most tempting to derive from dates - a blocker recorded
 * late, raised late, must have been foreseeable. That inference is wrong often enough to be unfair
 * every time, and a product that made it would be reading a calendar as a character judgement.
 */

export type Kind =
  | 'NOT_BUILT'
  | 'INTEGRATION'
  | 'CONTRACT_CHANGED'
  | 'CANNOT_TEST'
  | 'DECISION'
  | 'SEEN_COMING';

/** What each kind means, in words a non-technical reader can act on. */
export const WHAT_IT_MEANS: Record<Kind, string> = {
  NOT_BUILT: 'The thing they are waiting for does not exist yet.',
  INTEGRATION: 'Both parts exist and do not work together.',
  CONTRACT_CHANGED: 'What the two sides agreed the join would be has changed.',
  CANNOT_TEST: 'It cannot be tried: no rig, no environment, or no access.',
  DECISION: 'Somebody has to decide and has not.',
  SEEN_COMING: 'It was known early enough to plan around, and was not raised.',
};

/**
 * WHO CAN ACTUALLY MOVE IT. The point of the whole enum.
 *
 * Deliberately vague about names: this knows the shape of the person, not who they are, and a
 * product that named them would be assigning work it cannot see the org chart for.
 */
export const WHO_CAN_MOVE_IT: Record<Kind, string> = {
  NOT_BUILT: 'Whoever owns the other side, or whoever can change what is expected of them.',
  INTEGRATION: 'Both sides together. Neither can fix this alone, which is why it sits so long.',
  CONTRACT_CHANGED: 'The two sides, and whoever can say which version stands.',
  CANNOT_TEST: 'Whoever controls the environment. Usually not the person waiting.',
  DECISION: 'The person who has to decide. This is the cheapest one on the list to clear.',
  SEEN_COMING: 'A conversation about how this is being run, not about the blocker.',
};

/**
 * THE ONE THAT IS ABOUT A PERSON, AND HOW IT MUST BE HANDLED.
 *
 * Every other kind describes the work. This one describes how somebody managed it, which makes it
 * the only one that can be read as an accusation - so it is stated as the person's own account of
 * their own situation, and never presented as a finding about whoever they were waiting on.
 */
export const SEEN_COMING_IS_NOT_AN_ACCUSATION =
  'Recorded because the person waiting said so about their own work. It is not a finding about'
  + ' anybody else, and knowing something was coming is not the same as having been able to stop it.';

export function howToSayIt(kind: Kind | null, what: string, onLabel: string | null): string {
  const on = onLabel ? ` on ${onLabel}` : '';
  if (!kind) {
    /* Most blockers are described without being classified, and that is a complete record. */
    return `Waiting${on} for ${what}.`;
  }
  const tail = kind === 'SEEN_COMING' ? ` ${SEEN_COMING_IS_NOT_AN_ACCUSATION}` : '';
  return `Waiting${on} for ${what}. ${WHAT_IT_MEANS[kind]} ${WHO_CAN_MOVE_IT[kind]}${tail}`;
}

/** Given to the synthesis with the blockers. */
export const NEVER_CONCLUDE_FROM_A_KIND =
  'WHAT THE KIND OF A BLOCKER DOES NOT TELL YOU. It is the account of the person waiting, about '
  + 'their own work, and it is not a finding about whoever they are waiting on - that person has '
  + 'their own account and may describe the same thing differently. Never write that one side '
  + 'caused a blocker, and never treat "it was seen coming" as evidence that somebody should have '
  + 'prevented it: knowing something is coming is not the same as being able to stop it.';
