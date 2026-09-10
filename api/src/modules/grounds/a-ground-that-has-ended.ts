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

export function hasEnded(status: GroundStatus | string | null | undefined): boolean {
  return !!status && (A_GROUND_IS_OVER as string[]).includes(status);
}

/** What to say about a ground that is over, in the words of the decision that ended it. */
export function howItEnded(status: GroundStatus | string | null | undefined, endStateLabel?: string | null): string | null {
  if (!hasEnded(status)) return null;
  if (status === GroundStatus.STALLED) return 'This check-in stopped without an agreed end.';
  return endStateLabel ? `This check-in ended: ${endStateLabel.toLowerCase()}.` : 'This check-in has ended.';
}
