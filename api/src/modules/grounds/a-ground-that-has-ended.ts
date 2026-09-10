import { GroundStatus } from '@prisma/client';

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
export const A_GROUND_IS_OVER: GroundStatus[] = [GroundStatus.RESOLVED, GroundStatus.CLOSED, GroundStatus.STALLED];

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

export function isHeld(status: GroundStatus | string | null | undefined): boolean {
  return !!status && (A_GROUND_IS_HELD as string[]).includes(status);
}

/**
 * May a sweep, a listener or a side effect change this ground's status without a person asking?
 * False once it has ended and false while it is held. An unreadable status says yes, deliberately:
 * this file does not fail closed on a test double, and neither should its callers.
 */
export function mayChangeOnItsOwn(status: GroundStatus | string | null | undefined): boolean {
  return !hasEnded(status) && !isHeld(status);
}

/** What to say about a ground that is over, in the words of the decision that ended it. */
export function howItEnded(status: GroundStatus | string | null | undefined, endStateLabel?: string | null): string | null {
  if (!hasEnded(status)) return null;
  if (status === GroundStatus.STALLED) return 'This check-in stopped without an agreed end.';
  return endStateLabel ? `This check-in ended: ${endStateLabel.toLowerCase()}.` : 'This check-in has ended.';
}

/** What to say about a ground that is held. One sentence, written once, the same everywhere it is refused. */
export const WHILE_IT_IS_HELD = 'This check-in is on hold. Nothing can be added to it until it is resumed.';

/**
 * Why nothing can be added to this ground right now - ended or held - or null while it is live.
 * For the doors that refuse either: a join link, a message, a new participant.
 */
export function whyItRefuses(status: GroundStatus | string | null | undefined, endStateLabel?: string | null): string | null {
  if (isHeld(status)) return WHILE_IT_IS_HELD;
  return howItEnded(status, endStateLabel);
}
