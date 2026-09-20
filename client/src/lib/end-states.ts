// MIRROR of api/src/modules/resolution/end-states.ts - the per-scenario end
// states a ground builds toward. The create flow's step 5 offers THESE (in the
// scenario's own vocabulary) so the start target and the closing outcome speak
// the same language. Kept in sync by end-state-mirror.spec.ts, which parses
// the server file and compares labels verbatim.
//
// The chosen LABEL is stored as ground.resolutionState (a free-text column) -
// existing grounds keep their old generic-12 strings untouched; prompts and
// reports read the text either way.

export interface EndStateOption {
  value: string;
  label: string;
  description?: string;
}

export const END_STATES: Record<string, EndStateOption[]> = {
  ROLE_HANDOVER: [
    { value: 'HANDED_OVER', label: 'Handed over' },
    { value: 'GAPS_REMAIN', label: 'Handed over with named gaps', description: 'The successor has it, and both sides named what was not transferred rather than pretending it was.' },
    { value: 'NEEDS_MORE_TIME', label: 'Not finished - extend it' },
    { value: 'PREDECESSOR_GONE', label: 'Ended without the predecessor', description: 'They left before this finished. Recorded honestly so the gaps are attributed to the circumstance rather than to the successor.' },
  ],
  CONTRACT_REVIEW: [
    { value: 'SIGNED', label: 'Signed' },
    { value: 'SIGNED_WITH_CHANGES', label: 'Signed, with what changed named', description: 'The review surfaced things the draft did not say, and they were written in before signing.' },
    { value: 'NOT_YET', label: 'Not ready to sign - with the open questions named' },
    { value: 'NOT_PROCEEDING', label: 'Not proceeding', description: 'The two sides found they meant different things by it. Better found now than in a year.' },
  ],
  IMPLEMENTATION_TRACKING: [
    { value: 'RUNNING_AS_AGREED', label: 'Running as agreed' },
    { value: 'RUNNING_WITH_OPEN_QUESTIONS', label: 'Running, with open questions named', description: 'Nothing is wrong and some things are unexplained. Both sides know which.' },
    { value: 'NEEDS_AN_AMENDMENT', label: 'The arrangement needs changing', description: 'What the two sides are actually doing has moved away from what was signed, and both say so.' },
    { value: 'ENDED', label: 'The arrangement ended' },
  ],
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
  /** Mirror of the server's OPEN_READ set. Plainest in the product, because the shape was unknown. */
  OPEN_READ: [
    { value: 'shared_picture', label: 'Shared picture established', description: 'Everyone has given their account and the differences are named.' },
    { value: 'needs_specific_ground', label: 'Now clear enough to name the situation', description: 'The accounts show what this actually is, and it deserves its own check-in.' },
    { value: 'not_yet', label: 'Not yet - more accounts needed', description: 'Too few people have checked in to read anything from it.' },
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
  /**
   * MIRRORS THE SERVER, INCLUDING THE FOUR OUTCOME STATES THAT WERE MISSING.
   *
   * Every state here used to close on the picture, and one of them said so out loud: "any decision
   * now happens outside this check-in". So a fortnight of daily check-ins opened because a client had
   * just left could only finish by recording that everybody agreed on what had happened. Whether the
   * client came back had nowhere to go.
   */
  ACUTE_SHOCK: [
    { value: 'OBJECTIVE_MET', label: 'What we set out to do, done', description: 'The objective set after the first session was achieved, and the record shows what moved and who moved it.' },
    { value: 'PARTLY_RECOVERED', label: 'Partly recovered', description: 'Some of the objective was achieved and some was not. The record shows which parts, and what was still stuck at the end.' },
    { value: 'NOT_RECOVERED', label: 'Not recovered', description: 'The objective was not met. The record shows what was tried and where it stalled. That is what the next decision should rest on.' },
    { value: 'OBJECTIVE_OVERTAKEN', label: 'Overtaken by events', description: 'What we were aiming at stopped being the right aim partway through. The record shows when that became clear, and why.' },
    { value: 'PICTURE_SHARED', label: 'Shared picture established, nothing to recover', description: "Everyone's accounts are on record and agreed, and there was nothing to win back. No objective was set, deliberately." },
    { value: 'READS_DIVERGE', label: 'Accounts differ - gaps named', description: 'The accounts never reconciled, so no shared objective could honestly be set. The points of divergence are named so the conversation starts there.' },
    { value: 'UNKNOWNS_REMAIN', label: 'Key facts still unknown', description: 'The picture cannot be settled yet because named facts are still missing. Revisit when they land.' },
    { value: 'NOT_YET', label: 'Not yet - more accounts needed' },
  ],
  /**
   * A one-off read cannot "resolve" - there is no objective to have met and no follow-up to book.
   * What it can say is whether anything in the accounts needs opening as a situation that runs.
   */
  TEAM_UPDATES: [
    { value: 'STILL_RUNNING', label: 'Keep it running' },
    { value: 'DONE_WITH_IT', label: 'Stop it, it has done its job', description: 'The question has been answered enough times that the lead knows what they wanted to know.' },
    { value: 'NEEDS_A_RUN', label: 'Something here needs more than an update', description: 'The answers point at something that will not settle by being asked again. Open the situation that fits it, so there is an objective and a run of check-ins against it.' },
    { value: 'THIN_RESPONSE', label: 'People stopped answering', description: 'Too few replies for the picture to mean anything. Nothing is concluded from what did come in, and the honest read is about the rhythm rather than the people.' },
  ],  SNAPSHOT: [
    { value: 'READ_TAKEN', label: 'Read taken, nothing needs opening', description: 'Everyone answered and nothing needs watching over time. The record stands as a snapshot of this week.' },
    { value: 'NEEDS_A_RUN', label: 'Something here needs watching', description: 'The accounts point at something that will not settle on its own. Open the situation that fits it, so there is an objective and a run of check-ins against it.' },
    { value: 'THIN_RESPONSE', label: 'Too few answers to read', description: 'Not enough people answered for the spread to mean anything. Nothing is concluded from what did come in.' },
  ],
};

export function endStatesFor(scenario: string | null | undefined): EndStateOption[] {
  return (scenario && END_STATES[scenario]) || [];
}
