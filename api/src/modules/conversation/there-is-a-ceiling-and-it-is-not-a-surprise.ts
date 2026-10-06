/**
 * THERE IS A CEILING, AND IT SHOULD NOT BE A SURPRISE.
 *
 * A check-in accepts twenty answers. The twenty-first was refused with "Session turn limit
 * reached. Please complete your session." — a sentence about a limit nobody had mentioned, arriving
 * in the middle of somebody's account of their work, with the thing they had just typed refused.
 * Two problems in one line: nothing warned them it was coming, and the refusal reads as a fault
 * rather than as "you have said plenty, finish up".
 *
 * So the ceiling announces itself before it arrives, and the refusal — when it comes — tells them
 * their record is safe and what to do. The number does not move: twenty answers is a long check-in,
 * and a session that runs past it is usually one that needed finishing several turns ago.
 */

export const A_CHECK_IN_TAKES_ANSWERS = 20;
/** How many left when we first mention it. Late enough not to hurry anybody, early enough to plan. */
export const MENTION_IT_WITH_LEFT = 3;

/** Said alongside a normal reply, or null when there is nothing worth saying yet. */
export function howMuchRoomIsLeft(answersSoFar: number): string | null {
  const left = A_CHECK_IN_TAKES_ANSWERS - answersSoFar;
  if (left > MENTION_IT_WITH_LEFT || left <= 0) return null;
  if (left === 1) return 'There is room for one more answer in this session - after that, finish and the record is written.';
  return `There is room for ${left} more answers in this session. Anything still on your mind is worth saying now.`;
}

/** The refusal itself, for somebody who has reached it. */
export function theCeilingIsReached(): string {
  return (
    'This session is full. It holds twenty answers, and everything you have said is on the record. ' +
    'Finish the check-in, and it will be written up. You can open another session afterwards to add more. ' +
    'Nothing you have written is lost.'
  );
}
