import { GroundScenario } from '@prisma/client';

/**
 * The end states each scenario builds toward (Part 8 / moment selector). The
 * ground closes only when BOTH parties confirm the same end state - no single
 * party has unilateral authority over it (especially cofounder grounds).
 */
export const END_STATES: Record<GroundScenario, { value: string; label: string; description?: string }[]> = {
  NEW_HIRE: [
    { value: 'KEEP', label: 'Keep the hire' },
    { value: 'RESTRUCTURE', label: 'Restructure the role' },
    { value: 'EXIT', label: 'Let them go' },
    { value: 'EXTEND', label: 'Extend evaluation period', description: 'Both parties agree the evaluation period should continue with a defined extension timeline.' },
    { value: 'NOT_YET', label: 'Not yet - revisit with a named gap' },
  ],
  NEW_COFOUNDER: [
    { value: 'CONTINUE', label: 'Continue the partnership' },
    { value: 'RESTRUCTURE', label: 'Restructure the arrangement' },
    { value: 'SEPARATE', label: 'Separate' },
    { value: 'NOT_YET', label: 'Not yet - revisit with a named gap' },
  ],
  NEW_ADVISOR: [
    { value: 'RENEW', label: 'Renew the engagement' },
    { value: 'RESTRUCTURE', label: 'Restructure the engagement' },
    { value: 'END', label: 'End the engagement' },
    { value: 'NOT_YET', label: 'Not yet - revisit with a named gap' },
  ],
  NEW_PROJECT: [
    { value: 'COMPLETE', label: 'Mark complete' },
    { value: 'CONTINUE', label: 'Continue' },
    { value: 'DESCOPE', label: 'Descope' },
    { value: 'STOP', label: 'Stop the project' },
  ],
  NEW_MANAGER: [
    { value: 'CONTINUE', label: 'Extend the engagement' },
    { value: 'RESTRUCTURE', label: 'Restructure the scope or terms' },
    { value: 'END', label: 'End the engagement' },
    { value: 'NOT_YET', label: 'Not yet - revisit with a named gap' },
  ],
  CONTRACT_RENEWAL: [
    { value: 'RENEW', label: 'Renew on current terms' },
    { value: 'RENEGOTIATE', label: 'Renew on revised terms' },
    { value: 'EXIT', label: 'Do not renew' },
    { value: 'NOT_YET', label: 'Extend evaluation period' },
  ],
  RECOGNITION: [
    { value: 'YES', label: 'Grant the ask' },
    { value: 'NO', label: 'Decline' },
    { value: 'NOT_YET', label: 'Not yet - with a named gap and milestone' },
  ],
  DRIFT: [
    { value: 'CONTINUE', label: 'Continue' },
    { value: 'RESTRUCTURE', label: 'Restructure' },
    { value: 'DESCOPE', label: 'Descope' },
    { value: 'SEPARATE', label: 'Separate' },
    { value: 'EXIT', label: 'Exit' },
    { value: 'STOP', label: 'Stop' },
    { value: 'NOT_YET', label: 'Not yet - revisit with a named gap' },
  ],
  CRISIS_ALIGNMENT: [
    { value: 'ALIGNED', label: 'Shared picture established - team aligned' },
    { value: 'RESTRUCTURE', label: 'Structure or priorities need to change' },
    { value: 'ESCALATE', label: 'Requires external support or intervention' },
    { value: 'NOT_YET', label: 'Not yet - revisit when more information is available' },
  ],
  OKR_ALIGNMENT: [
    { value: 'ALIGNED', label: 'OKRs aligned to company direction' },
    { value: 'GAPS_IDENTIFIED', label: 'Gaps identified - revision needed' },
    { value: 'NOT_YET', label: 'Not yet - more sessions needed' },
  ],
  WORKPLAN_BUDGET: [
    { value: 'APPROVED', label: 'Workplan and budget approved' },
    { value: 'REVISION_NEEDED', label: 'Revision needed before approval' },
    { value: 'NOT_YET', label: 'Not yet - plan not complete' },
  ],
  PULSE_CHECK: [
    { value: 'ON_TRACK', label: 'On track' },
    { value: 'ATTENTION_NEEDED', label: 'Attention needed on named items' },
    { value: 'NOT_YET', label: 'Not yet - check again next session' },
  ],
  REALIGN_TEAM: [
    { value: 'REALIGNED', label: 'Team realigned on shared direction' },
    { value: 'GAPS_REMAIN', label: 'Gaps remain - further conversation needed' },
    { value: 'ESCALATE', label: 'Requires leadership decision' },
    { value: 'NOT_YET', label: 'Not yet - more accounts needed' },
  ],
  PIP: [
    { value: 'RESOLVED', label: 'Performance concern resolved' },
    { value: 'EXTENDED', label: 'Plan extended with named conditions' },
    { value: 'SEPARATED', label: 'Separation agreed' },
    { value: 'NOT_YET', label: 'Not yet - plan still running' },
  ],
  BOARD_STRATEGY: [
    { value: 'ALIGNED', label: 'Strategy aligned' },
    { value: 'REVISE', label: 'Strategy needs revision' },
    { value: 'ESCALATE', label: 'Unresolved - escalate to full board' },
    { value: 'NOT_YET', label: 'Not yet - still debating' },
  ],
  COHORT_CHECK: [
    { value: 'ON_TRACK', label: 'Cohort on track' },
    { value: 'MIXED', label: 'Mixed - some need support' },
    { value: 'AT_RISK', label: 'At risk - intervention needed' },
    { value: 'NOT_YET', label: 'Not yet - check-ins ongoing' },
  ],
  // ACUTE_SHOCK ends when the PICTURE is settled, not when a decision is made -
  // the decision happens after this ground, informed by the record.
  ACUTE_SHOCK: [
    { value: 'PICTURE_SHARED', label: 'Shared picture established', description: 'Everyone\'s accounts are on record and the picture of what happened is agreed. Any decision now happens outside this ground, informed by it.' },
    { value: 'READS_DIVERGE', label: 'Accounts differ - gaps named', description: 'The accounts do not match. The specific points of divergence are named so the follow-up conversation starts there.' },
    { value: 'UNKNOWNS_REMAIN', label: 'Key facts still unknown', description: 'The picture cannot be settled yet because named facts are still missing. Revisit when they land.' },
    { value: 'NOT_YET', label: 'Not yet - more accounts needed' },
  ],
};

export function endStatesFor(scenario: GroundScenario) {
  return END_STATES[scenario] ?? [];
}

export function isValidEndState(scenario: GroundScenario, value: string): boolean {
  return endStatesFor(scenario).some((o) => o.value === value);
}
