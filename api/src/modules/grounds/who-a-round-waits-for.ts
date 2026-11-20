import { AN_ANSWER } from './an-answer-includes-a-refusal';
import { whoASessionCounts } from './the-lead-checks-in-when-they-choose';

/**
 * WHO A ROUND WAITS FOR, SAID ONCE (run 6, 20 November).
 *
 * Taa Solar's rounds never closed. Ruth was invited by address and never opened the invitation, and Mary was removed, and
 * `recordRoundCompletion` still waited on both for ever, so no round was recorded, "a round has completed" was never said, and
 * everything that reads it (what people said against a target, the room's aims, the digest) never ran. `isSessionReadyForReport`
 * already knew the rule: somebody is waited on when they signed in, answered, or hold an invitation that is still open. It lived
 * only there. Now both ask this one clause, and a person who has left the check-in is waited on by neither.
 */
export function whoARoundWaitsFor(sessionNumber: number, now: Date = new Date()) {
  return {
    leftAt: null,
    AND: [whoASessionCounts(sessionNumber, AN_ANSWER)],
    OR: [
      { userId: { not: null } },
      { checkIns: { some: { sessionNumber, status: 'COMPLETED' as any } } },
      /* Invited, not yet accepted, and the invitation has not run out. */
      { userId: null, invitedAt: { not: null }, inviteTokenExpiresAt: { gt: now } },
    ],
  };
}
