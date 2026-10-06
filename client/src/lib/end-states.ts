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
    { value: 'HANDED_OVER', label: 'The work has been handed over.' },
    { value: 'GAPS_REMAIN', label: 'The work has been handed over, and what was not passed on is named.', description: 'The successor has it, and both sides named what was not transferred rather than pretending it was.' },
    { value: 'NEEDS_MORE_TIME', label: 'The handover is not finished, so it is given more time.' },
    { value: 'PREDECESSOR_GONE', label: 'The person handing over left before the handover was finished.', description: 'They left before this finished. Recorded honestly so the gaps are attributed to the circumstance rather than to the successor.' },
  ],
  CONTRACT_REVIEW: [
    { value: 'SIGNED', label: 'The contract is signed.' },
    { value: 'SIGNED_WITH_CHANGES', label: 'The contract is signed, with the changes written into it.', description: 'The review surfaced things the draft did not say, and they were written in before signing.' },
    { value: 'NOT_YET', label: 'The contract is not ready to sign, and the open questions are named.' },
    { value: 'NOT_PROCEEDING', label: 'The two sides are not going ahead with the contract.', description: 'The two sides found they meant different things by it. Better found now than in a year.' },
  ],
  IMPLEMENTATION_TRACKING: [
    { value: 'RUNNING_AS_AGREED', label: 'The arrangement is running as agreed.' },
    { value: 'RUNNING_WITH_OPEN_QUESTIONS', label: 'The arrangement is running, and the open questions are named.', description: 'Nothing is wrong and some things are unexplained. Both sides know which.' },
    { value: 'NEEDS_AN_AMENDMENT', label: 'The arrangement needs to change.', description: 'What the two sides are actually doing has moved away from what was signed, and both say so.' },
    { value: 'ENDED', label: 'The arrangement has ended.' },
  ],
  NEW_HIRE: [
    { value: 'KEEP', label: 'The person stays in the role.' },
    { value: 'RESTRUCTURE', label: 'The role is set up differently.' },
    { value: 'EXIT', label: 'The role does not continue. The person\'s history stays as it is.' },
    { value: 'EXTEND', label: 'The time to decide is made longer.', description: 'Both agree the evaluation period should continue, with a defined extension timeline.' },
    { value: 'NOT_YET', label: 'It is not decided yet, and what is missing is named so it can be looked at again.' },
  ],
  NEW_COFOUNDER: [
    { value: 'CONTINUE', label: 'The partnership carries on.' },
    { value: 'RESTRUCTURE', label: 'The partnership is set up differently.' },
    { value: 'SEPARATE', label: 'The partners go their separate ways.' },
    { value: 'NOT_YET', label: 'It is not decided yet, and what is missing is named so it can be looked at again.' },
  ],
  NEW_ADVISOR: [
    { value: 'RENEW', label: 'The work with the adviser is renewed.' },
    { value: 'RESTRUCTURE', label: 'The work with the adviser is set up differently.' },
    { value: 'END', label: 'The work with the adviser ends.' },
    { value: 'NOT_YET', label: 'It is not decided yet, and what is missing is named so it can be looked at again.' },
  ],
  NEW_PROJECT: [
    { value: 'COMPLETE', label: 'The project is complete.' },
    { value: 'CONTINUE', label: 'The project carries on.' },
    { value: 'DESCOPE', label: 'The project carries on with less in it.' },
    { value: 'STOP', label: 'The project stops.' },
  ],
  NEW_MANAGER: [
    { value: 'CONTINUE', label: 'The arrangement carries on for longer.' },
    { value: 'RESTRUCTURE', label: 'What the arrangement covers, or its terms, are changed.' },
    { value: 'END', label: 'The arrangement ends.' },
    { value: 'NOT_YET', label: 'It is not decided yet, and what is missing is named so it can be looked at again.' },
  ],
  CONTRACT_RENEWAL: [
    { value: 'RENEW', label: 'The contract is renewed on the same terms.' },
    { value: 'RENEGOTIATE', label: 'The contract is renewed on new terms.' },
    { value: 'EXIT', label: 'The contract is not renewed.' },
    { value: 'NOT_YET', label: 'The time to decide is made longer.' },
  ],
  RECOGNITION: [
    { value: 'YES', label: 'The request is granted.' },
    { value: 'NO', label: 'The request is declined.' },
    { value: 'NOT_YET', label: 'It is not decided yet, and what is missing is named, with a point to reach first.' },
  ],
  DRIFT: [
    { value: 'CONTINUE', label: 'The work carries on as it is.' },
    { value: 'RESTRUCTURE', label: 'The work is set up differently.' },
    { value: 'DESCOPE', label: 'The work carries on with less in it.' },
    { value: 'SEPARATE', label: 'The people involved go their separate ways.' },
    { value: 'EXIT', label: 'The role does not continue. The person\'s history stays as it is.' },
    { value: 'STOP', label: 'The work stops.' },
    { value: 'NOT_YET', label: 'It is not decided yet, and what is missing is named so it can be looked at again.' },
  ],
  CRISIS_ALIGNMENT: [
    { value: 'ALIGNED', label: 'Everyone now shares the same picture of what happened.' },
    { value: 'RESTRUCTURE', label: 'How the work is set up, or what comes first, needs to change.' },
    { value: 'ESCALATE', label: 'Help is needed from outside the team.' },
    { value: 'NOT_YET', label: 'It is not settled yet, and it will be looked at again when more is known.' },
  ],
  OKR_ALIGNMENT: [
    { value: 'ALIGNED', label: 'The team is on course.' },
    { value: 'REACH_WITH_A_CHANGE', label: 'The team can reach it, with a change in how the work is done.' },
    { value: 'GAPS_IDENTIFIED', label: 'The target needs to change.' },
    { value: 'NOT_YET', label: 'It is not settled yet, and more sessions are needed.' },
  ],
  WORKPLAN_BUDGET: [
    { value: 'APPROVED', label: 'The work plan and the budget are approved.' },
    { value: 'REVISION_NEEDED', label: 'The plan needs changes before it can be approved.' },
    { value: 'NOT_YET', label: 'It is not settled yet, because the plan is not complete.' },
  ],
  PULSE_CHECK: [
    { value: 'ON_TRACK', label: 'Things are going as planned.' },
    { value: 'ATTENTION_NEEDED', label: 'Some things, each one named, need attention.' },
    { value: 'NOT_YET', label: 'It is not settled yet, and it will be checked again next session.' },
  ],
  /** Mirror of the server's OPEN_READ set. Plainest in the product, because the shape was unknown. */
  OPEN_READ: [
    { value: 'shared_picture', label: 'Everyone now shares the same picture.', description: 'Everyone has given their account and the differences are named.' },
    { value: 'needs_specific_ground', label: 'It is now clear what this is, and it needs its own check-in.', description: 'The accounts show what this actually is, and it needs its own check-in.' },
    { value: 'not_yet', label: 'It is not settled yet, and more people need to answer.', description: 'Too few people have checked in to read anything from it.' },
  ],
  REALIGN_TEAM: [
    { value: 'REALIGNED', label: 'The team agrees again on where it is going.' },
    { value: 'GAPS_REMAIN', label: 'Some differences remain, and more talking is needed.' },
    { value: 'ESCALATE', label: 'A leader needs to decide.' },
    { value: 'NOT_YET', label: 'It is not settled yet, and more people need to answer.' },
  ],
  PIP: [
    { value: 'RESOLVED', label: 'The concern about the work has been resolved.' },
    { value: 'EXTENDED', label: 'The plan is made longer, with named conditions.' },
    { value: 'SEPARATED', label: 'Both sides agreed that the person will leave.' },
    { value: 'NOT_YET', label: 'It is not settled yet, and the plan is still running.' },
  ],
  BOARD_STRATEGY: [
    { value: 'ALIGNED', label: 'The board agrees on the strategy.' },
    { value: 'REVISE', label: 'The strategy needs to change.' },
    { value: 'ESCALATE', label: 'It is not settled, so it goes to the full board.' },
    { value: 'NOT_YET', label: 'It is not settled yet, and the discussion goes on.' },
  ],
  COHORT_CHECK: [
    { value: 'ON_TRACK', label: 'The group is going as planned.' },
    { value: 'MIXED', label: 'Some people in the group need support.' },
    { value: 'AT_RISK', label: 'The group needs help to get back on track.' },
    { value: 'NOT_YET', label: 'It is not settled yet, and the check-ins are still going on.' },
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
    { value: 'OBJECTIVE_MET', label: 'What we set out to do is done.', description: 'The objective set after the first session was achieved, and the record shows what moved and who moved it.' },
    { value: 'PARTLY_RECOVERED', label: 'Part of what was lost has been won back.', description: 'Some of the objective was achieved and some was not. The record shows which parts, and what was still stuck when the fortnight ended.' },
    { value: 'NOT_RECOVERED', label: 'What was lost has not been won back.', description: 'The objective was not met. The record shows what was tried and where it stalled. That is what the next decision should rest on.' },
    { value: 'OBJECTIVE_OVERTAKEN', label: 'Events changed what we were aiming for.', description: 'What we were aiming at stopped being the right aim partway through. The record shows when that became clear, and why.' },
    { value: 'PICTURE_SHARED', label: 'Everyone shares the same picture, and there was nothing to win back.', description: 'The accounts are on record and agreed, and there was nothing to win back, because the event was what it was. No objective was set, deliberately.' },
    { value: 'READS_DIVERGE', label: 'The accounts differ, and the differences are named.', description: 'The accounts never reconciled, so no shared objective could honestly be set. The specific points of divergence are named so the conversation starts there.' },
    { value: 'UNKNOWNS_REMAIN', label: 'Some important facts are still not known.', description: 'The picture cannot be settled yet because named facts are still missing. Revisit when they land.' },
    { value: 'NOT_YET', label: 'It is not settled yet, and more people need to answer.' },
  ],
  /**
   * A one-off read cannot "resolve" - there is no objective to have met and no follow-up to book.
   * What it can say is whether anything in the accounts needs opening as a situation that runs.
   */
  TEAM_UPDATES: [
    { value: 'STILL_RUNNING', label: 'The update keeps running.' },
    { value: 'DONE_WITH_IT', label: 'The update stops, because it has done its job.', description: 'The question has been answered enough times that the lead knows what they wanted to know.' },
    { value: 'NEEDS_A_RUN', label: 'Something here needs more than an update.', description: 'The answers point at something that will not settle by being asked again. Open the situation that fits it, so there is an objective and a run of check-ins against it.' },
    { value: 'THIN_RESPONSE', label: 'People stopped answering.', description: 'Too few replies for the picture to mean anything. Nothing is concluded from what did come in, and the honest read is about the rhythm rather than the people.' },
  ],
  DISCOVERY: [
    { value: 'DIRECTION_SET', label: 'It is clear enough what to do next.', description: 'Enough accounts named the same regions, value chains and gaps that the priorities can be set from them.' },
    { value: 'NEEDS_MORE_VOICES', label: 'Not enough of the people asked have answered.', description: 'What came in points somewhere, and too few people answered for it to carry a decision. Ask the rest before setting anything.' },
    { value: 'NO_CLEAR_DIRECTION', label: 'No clear direction came out of it.', description: 'The accounts point in different directions and nothing is shared enough to prioritise. That is a finding, and it is recorded as one.' },
  ],
  SNAPSHOT: [
    { value: 'READ_TAKEN', label: 'Everyone answered, and nothing needs to be opened.', description: 'Everyone answered and nothing in the accounts needs watching over time. The record stands as a snapshot of this week.' },
    { value: 'NEEDS_A_RUN', label: 'Something here needs watching.', description: 'The accounts point at something that will not settle on its own. Open the situation that fits it, so there is an objective and a run of check-ins against it.' },
    { value: 'THIN_RESPONSE', label: 'Too few people answered to read anything from it.', description: 'Not enough people answered for the spread to mean anything. Nothing is concluded from what did come in.' },
  ],
};

export function endStatesFor(scenario: string | null | undefined): EndStateOption[] {
  return (scenario && END_STATES[scenario]) || [];
}
