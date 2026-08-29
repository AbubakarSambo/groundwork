/**
 * A PROPOSAL IS NOT AN AGREEMENT, AND THE INTERVIEW HAS TO KNOW WHICH IS WHICH.
 *
 * The requirement in one line: while a change from six to four is awaiting approval, Groundwork must
 * still know six is the agreed target, AND know four has been asked for. Both, at once, without
 * either quietly becoming the other.
 *
 * WHY THIS IS NOT A WORKFLOW ENGINE. It holds one proposed change to one agreement, who must answer,
 * and what happened. Approval can be done here or in the customer's own system - the record is the
 * same either way, and Groundwork does not route, remind, escalate or chain. A general engine is a
 * product the customer already has, and building one would make Groundwork responsible for outcomes
 * it cannot see.
 */
import { ProposedChangeState } from '@prisma/client';

export type Pending = {
  proposedText: string;
  reason: string | null;
  approverExternalId: string;
  proposedByExternalId: string;
  createdAt: Date;
};

/**
 * How a pending change is described to the interview.
 *
 * Both numbers, in the order that makes the current one the subject: what holds now first, what has
 * been asked for second. Reversed, a reader skims it as though the change has happened - which is the
 * failure this whole model exists to prevent, reintroduced in the wording.
 */
export function describePending(currentText: string, p: Pending, now: Date): string {
  const days = Math.max(0, Math.floor((now.getTime() - p.createdAt.getTime()) / 86_400_000));
  const waited = days === 0 ? 'today' : days === 1 ? 'since yesterday' : `for ${days} days`;
  return [
    `STILL AGREED: ${currentText}`,
    `PROPOSED, NOT YET AGREED: ${p.proposedText}`,
    p.reason ? `Reason given: ${p.reason}` : null,
    `Waiting on ${p.approverExternalId} to decide, ${waited}.`,
  ].filter(Boolean).join('\n');
}

/**
 * The instruction. Separate from the description because the two change for different reasons.
 */
export const PENDING_RULE =
  'A CHANGE HAS BEEN ASKED FOR AND NOT YET AGREED. Treat what is STILL AGREED as the thing in force - '
  + 'it is what they are working against today, and questions about progress are about that number. '
  + 'Never speak as though the proposed version has been accepted, and never ask them to justify a '
  + 'change that has already been explained. What is useful here is whether anything has moved that '
  + 'the approver should know about - something that makes the case stronger, weaker, or beside the '
  + 'point. If they have given up on the change or no longer want it, that is worth recording too.';

/** Which states still hold the agreement open. Everything else is settled. */
export function isOpen(state: ProposedChangeState): boolean {
  return state === ProposedChangeState.AWAITING_APPROVAL;
}

/**
 * WHAT APPROVAL ACTUALLY CHANGES.
 *
 * On approval the objective's text becomes the proposed text, and that is the only moment it moves.
 * Rejection changes nothing about the objective - which is the point: the agreement was never
 * suspended, so there is nothing to restore.
 */
export function textAfter(state: ProposedChangeState, currentText: string, proposedText: string): string {
  return state === ProposedChangeState.APPROVED ? proposedText : currentText;
}
