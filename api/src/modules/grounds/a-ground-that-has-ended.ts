import { theEndingSaid } from '../resolution/end-states';
import { GroundStatus, GroundScenario } from '@prisma/client';

/**
 * A GROUND THAT HAS ENDED HAS ENDED.
 *
 * Watched live on 10 September 2026: a lead confirmed the end state, the resolution row was
 * written, the ground went CLOSED - and then it came back. Two things did it, both innocent on
 * their own:
 *
 *   1. Completing the closing check-in schedules the next session, because completing any check-in
 *      does. Session 5 of 6 appeared for both people on a check-in that was over.
 *   2. Releasing the report of that same session sets the ground ACTIVE, because releasing a report
 *      normally means the ground is live. It ran after the close and overwrote it.
 *
 * So the page said "Session 5 of 6 · 89 days remaining" about a decision that had been taken. One
 * list of terminal statuses, one question, asked in both places.
 */
export const A_GROUND_IS_OVER: GroundStatus[] = [GroundStatus.RESOLVED, GroundStatus.CLOSED];

/**
 * AND A GROUND THAT STOPPED IS NOT A GROUND THAT ENDED.
 *
 * Nate Peterson, 23 September 2026: "i let a few check-ins wait and they are now stalled, with no
 * clear way to open them back up. i can't easily see where to reopen them or to extend the
 * timeline... the whole thing would be of little to no use even if many of the users checked in."
 *
 * He was right, and the cause was this list. RESOLVED and CLOSED are decisions somebody took.
 * STALLED is something that HAPPENS to a check-in while everybody is busy - a cron writes it at 3am
 * when the timeline runs out - and it was filed with the two decisions, so it inherited their one
 * property: no way back. The only state in this product a machine can put you in, and the only one
 * a person could not lift.
 *
 * So it is its own thing. Nothing accepts input while it is stalled, nothing moves on its own, and
 * a person can reopen it by giving it more time - which is exactly what they were reaching for when
 * they could not find the button. See `reopenAfterStalling` and `whyItRefuses` below.
 */
export const A_GROUND_HAS_STOPPED: GroundStatus[] = [GroundStatus.STALLED];

/**
 * WHAT THE NIGHTLY AND MORNING JOBS SKIP: ended, and stalled. On the live main line STALLED sat in the
 * ended list, so no job emailed, reminded, announced or messaged about a stalled check-in. Splitting
 * STALLED out (so a person can reopen it) must not change that: a job that sends something reads this
 * list. Only the stall and warning jobs read the two lists apart. Once a lead gives a check-in more
 * time it is no longer stalled, and the jobs pick it up again.
 */
export const A_GROUND_THE_JOBS_LEAVE_ALONE: GroundStatus[] = [...A_GROUND_IS_OVER, ...A_GROUND_HAS_STOPPED];

/**
 * A GROUND THAT IS HELD IS HELD.
 *
 * PAUSED exists for one reason - "temporarily paused (e.g. active legal proceedings detected)" - and
 * it was never added to any list. So the 3 AM stall sweep counted a paused ground as overdue and
 * wrote it STALLED, which is terminal and has no exit; releasing a report set it back to ACTIVE;
 * adding a participant set it AWAITING_PARTIES. A hold that three different writers can lift by
 * accident is not a hold. It is the same question as above with a different answer: nothing moves
 * this ground on its own. Only somebody lifting the hold does.
 */
export const A_GROUND_IS_HELD: GroundStatus[] = [GroundStatus.PAUSED];

export function hasEnded(status: GroundStatus | string | null | undefined): boolean {
  return !!status && (A_GROUND_IS_OVER as string[]).includes(status);
}

/** Stopped because the time ran out. Refuses everything an ended ground refuses, and can be lifted. */
export function hasStalled(status: GroundStatus | string | null | undefined): boolean {
  return !!status && (A_GROUND_HAS_STOPPED as string[]).includes(status);
}

/**
 * Nothing further can be added right now: ended, held, or stopped.
 *
 * THE DISTINCTION THIS KEEPS. `hasEnded` answers "is this over", which decides whether a next
 * session is scheduled and whether a decision has been taken. `isShut` answers "may anything be
 * written", which is what every door wants. They were one question and the answer to the first was
 * being used for the second, which is how STALLED became irreversible by accident.
 */
export function isShut(status: GroundStatus | string | null | undefined): boolean {
  return hasEnded(status) || isHeld(status) || hasStalled(status);
}

export function isHeld(status: GroundStatus | string | null | undefined): boolean {
  return !!status && (A_GROUND_IS_HELD as string[]).includes(status);
}

/**
 * May a sweep, a listener or a side effect change this ground's status without a person asking?
 * False once it has ended and false while it is held. An unreadable status says yes, deliberately:
 * this file does not fail closed on a test double, and neither should its callers.
 */
export function mayChangeOnItsOwn(status: GroundStatus | string | null | undefined): boolean {
  /* Stalled is included for the same reason PAUSED is: a sweep must not revive it, and must not
     stall it a second time and send everybody the same email again every night. Only a person. */
  return !hasEnded(status) && !isHeld(status) && !hasStalled(status);
}

/** What to say about a ground that is over, in the words of the decision that ended it. */
export function howItEnded(status: GroundStatus | string | null | undefined, endStateLabel?: string | null): string | null {
  if (!hasEnded(status)) return null;
  /* The ending is its own plain sentence (resolution/end-states.ts), never a piece after a colon. */
  if (!endStateLabel?.trim()) return 'This check-in has ended.';
  const said = endStateLabel.trim();
  return `This check-in has ended. ${said.endsWith('.') ? said : `${said}.`}`;
}

/**
 * WHAT TO SAY ABOUT A STOPPED ONE, WHICH IS THE SENTENCE THAT WAS MISSING.
 *
 * The old wording was "This check-in stopped without an agreed end." - true, final, and no help to
 * the person reading it, who had let a few check-ins wait and wanted to know what to do now. It
 * says what happened and what lifts it, because that is the whole question.
 */
export const IT_RAN_OUT_OF_TIME =
  'This check-in ran past the time it was given. Nobody can add to it until you give it more time. Everything already in it is kept.';

/** And to somebody who cannot give it more time themselves. */
export const IT_RAN_OUT_OF_TIME_ASK_THE_LEAD =
  'This check-in ran past the time it was given. Nothing can be added until whoever runs it gives it more time. Everything already in it is kept.';

/** What to say about a ground that is held. One sentence, written once, the same everywhere it is refused. */
export const WHILE_IT_IS_HELD = 'This check-in is on hold. Nothing can be added to it until it is resumed.';

/**
 * A JOIN LINK INTO A CHECK-IN THAT WAITS FOR AN ADMIN (reviewed on the server, 7 October). With 'each new check-in waits for an admin' on,
 * the check-in made from the entry chat stays held (1957f86f), but its join link still let anybody ask, confirm and be added to it, and
 * mailed them a way in, before any admin had said yes. The link is refused until it is accepted, and says why.
 */
export const WHILE_IT_WAITS_FOR_AN_ADMIN = 'This check-in is waiting for an admin to accept it. The link will work as soon as they do.';
export function whyAJoinLinkRefuses(
  status: GroundStatus | string | null | undefined,
  endStateLabel?: string | null,
  scenario?: GroundScenario | string | null,
): string | null {
  if (status === 'AWAITING_APPROVAL') return WHILE_IT_WAITS_FOR_AN_ADMIN;
  return whyItRefuses(status, endStateLabel, 'anybody else', scenario);
}

/**
 * Why nothing can be added to this ground right now - ended or held - or null while it is live.
 * For the doors that refuse either: a join link, a message, a new participant.
 */
export function whyItRefuses(
  status: GroundStatus | string | null | undefined,
  endStateLabel?: string | null,
  whoIsAsking: 'the lead' | 'anybody else' = 'anybody else',
  /**
   * The check-in's kind. With it, `endStateLabel` is the stored ending (`Ground.endState`, a value such
   * as "KEEP") and is read as its own sentence from end-states.ts; a person used to read "This check-in
   * ended: keep." An ending that is not one of this kind's is not said at all, never as the raw value.
   */
  scenario?: GroundScenario | string | null,
): string | null {
  if (isHeld(status)) return WHILE_IT_IS_HELD;
  if (hasStalled(status)) return whoIsAsking === 'the lead' ? IT_RAN_OUT_OF_TIME : IT_RAN_OUT_OF_TIME_ASK_THE_LEAD;
  return howItEnded(status, scenario !== undefined ? theEndingSaid(scenario, endStateLabel) : endStateLabel);
}
