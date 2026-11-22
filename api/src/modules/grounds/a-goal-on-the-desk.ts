/**
 * WHO MAY ADD OR CHANGE A GOAL ON THE DESK, AND TIE A CHECK-IN TO IT (Hafsah, 21 November 2026: "For desk: adding strategy or
 * goals and tying them to a check-in").
 *
 * A goal is the organisation's own objective (`Subject`, type OBJECTIVE, with no parent), the same row the Desk's "Is the strategy
 * moving?" already reads. A check-in feeds a goal through `ground.subjectExternalId`, the one field the integration API's
 * `POST /checkins` already writes and `what-a-check-in-feeds.ts` already reads. Nothing here keeps a second copy of either.
 *
 *   - An admin may add any goal, change any goal, choose who owns it, and tie any check-in in the organisation to it.
 *   - A lead may add a goal, which is theirs, change a goal they own, and tie only the check-ins they run.
 *   - Everybody else reads the goals on the Desk, as before, and may change nothing. The server refuses them, whatever a screen shows.
 *
 * THE WORDING OF A GOAL THAT CAME FROM THE ORGANISATION'S OWN SYSTEM IS NOT CHANGED HERE. The schema says it: "Never edited here; an
 * edit is proposed back or not offered." The next push from that system would put the old words back. Only a goal added on the Desk
 * has its words changed on the Desk; any goal may still have its check-ins tied.
 */

/** The source system of a goal added on the Desk. */
export const ADDED_ON_THE_DESK = 'desk';

export interface AGoalReader {
  userId: string;
  role: string;
  /** The reader's own record in the organisation's directory, which a goal's owner points at. Null when they have none. */
  personExternalId: string | null;
}

/** Whether this reader may add a goal or change one at all. */
export function mayChangeGoals(role: string | null | undefined): boolean {
  return role === 'ADMIN' || role === 'LEAD';
}

/** Whether this reader may change this one goal: an admin any, a lead only one they own. */
export function mayChangeThisGoal(r: AGoalReader, goal: { ownerExternalId: string | null }): boolean {
  if (r.role === 'ADMIN') return true;
  return r.role === 'LEAD' && !!r.personExternalId && goal.ownerExternalId === r.personExternalId;
}

/** Whether this reader may tie this check-in to a goal, or untie it: an admin any in the organisation, a lead only one they run. */
export function mayTieThisCheckIn(r: AGoalReader, ground: { initiatorId: string | null }): boolean {
  if (r.role === 'ADMIN') return true;
  return r.role === 'LEAD' && ground.initiatorId === r.userId;
}

/** Whether a goal's words may be changed here: only a goal that was added on the Desk. */
export function itsWordsAreChangedHere(goal: { sourceSystem: string }): boolean {
  return goal.sourceSystem === ADDED_ON_THE_DESK;
}

/** "Fed by Sales team, Q4 and Operations.", or the plain sentence for none. */
export function whatFeedsIt(labels: string[]): string {
  const names = [...new Set(labels.map((l) => l.trim()).filter(Boolean))];
  if (!names.length) return 'No check-in feeds this goal yet.';
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `Fed by ${list}.`;
}

export const NOT_YOURS_TO_CHANGE = 'Only an admin, or the lead who owns this goal, can change it.';
export const NOT_YOURS_TO_TIE = 'You can only tie the check-ins you run to a goal.';
export const NOT_YOURS_TO_ADD = 'Only an admin or a lead can add a goal to the Desk.';
export const ITS_WORDS_ARE_ELSEWHERE = 'This goal came from your organisation’s own system, so its words are changed there. You can still choose which check-ins feed it.';
export const NO_DIRECTORY_RECORD = 'You are not in your organisation’s directory yet, so a goal cannot be put in your name. Ask an admin to add the goal for you.';
export const GIVE_IT_A_TITLE = 'Say what the goal is, then add it again.';
