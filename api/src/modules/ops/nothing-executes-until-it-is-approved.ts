import { OpsApproval, OpsRoadmapStatus } from '@prisma/client';

/**
 * The rule an approval field is worthless without.
 *
 * `approvalRequired` on a roadmap item is a boolean, and a boolean nobody
 * enforces is a comment. This is the enforcement, kept in one function so the
 * roadmap service, the spec and any future path all ask the same question.
 *
 * PROPOSED is where an item waits. Every other status is work starting, which
 * is exactly what an approval is meant to gate — so the test is not "has it
 * been rejected" but "has it been approved", and the absence of any decision
 * blocks just as firmly as a refusal.
 */

export const STATUSES_THAT_MEAN_WORK_HAS_STARTED: OpsRoadmapStatus[] = [
  'READY',
  'IN_PROGRESS',
  'BLOCKED',
  'COMPLETED',
];

export interface ApprovalGateResult {
  allowed: boolean;
  /** Said plainly, because this is what the person who tried will read. */
  because: string;
}

export function mayMoveOutOfProposed(
  item: { approvalRequired: boolean; title: string },
  approvals: Pick<OpsApproval, 'status'>[],
  wanted: OpsRoadmapStatus,
): ApprovalGateResult {
  if (!STATUSES_THAT_MEAN_WORK_HAS_STARTED.includes(wanted)) {
    return { allowed: true, because: 'Still proposed' };
  }
  if (!item.approvalRequired) {
    return { allowed: true, because: 'This one does not need a decision' };
  }

  const approved = approvals.some((a) => a.status === 'APPROVED');
  if (approved) return { allowed: true, because: 'Approved' };

  const refused = approvals.find(
    (a) => a.status === 'REJECTED' || a.status === 'CHANGES_REQUESTED',
  );
  if (refused) {
    return {
      allowed: false,
      because:
        refused.status === 'REJECTED'
          ? `${item.title} was turned down. Propose it again rather than starting it.`
          : `${item.title} came back with changes asked for. Answer those first.`,
    };
  }

  const waiting = approvals.some((a) => a.status === 'PENDING');
  return {
    allowed: false,
    because: waiting
      ? `${item.title} is waiting on a decision.`
      : `${item.title} needs approval and none has been asked for yet.`,
  };
}
