import { GroundScenario } from '@prisma/client';

/**
 * The end states each scenario builds toward (Part 8 / moment selector).
 *
 * How a ground CLOSES depends on who the parties are to each other - see
 * LEAD_DECIDES below. Two peers must agree; where one person's position is what
 * the ground is about, the decision belongs to whoever holds it in real life.
 */
export const END_STATES: Record<GroundScenario, { value: string; label: string; description?: string }[]> = {
  ROLE_HANDOVER: [
    { value: 'HANDED_OVER', label: 'Handed over' },
    { value: 'GAPS_REMAIN', label: 'Handed over with named gaps', description: 'The successor has it, and both sides named what was not transferred rather than pretending it was.' },
    { value: 'NEEDS_MORE_TIME', label: 'Not finished - extend it' },
    { value: 'PREDECESSOR_GONE', label: 'Ended without the predecessor', description: 'They left before this finished. Recorded honestly so the gaps are attributed to the circumstance rather than to the successor.' },
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
  /**
   * Deliberately the plainest set in the product. OPEN_READ is used when the shape was not known at
   * the start, so its endings cannot presume one - no renew, no separate, no keep or let go.
   */
  OPEN_READ: [
    { value: 'shared_picture', label: 'Shared picture established', description: 'Everyone has given their account and the differences are named.' },
    { value: 'needs_specific_ground', label: 'Now clear enough to name the situation', description: 'The accounts show what this actually is, and it deserves its own ground.' },
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
  // ACUTE_SHOCK ends when the PICTURE is settled, not when a decision is made -
  // the decision happens after this ground, informed by the record.
  /**
   * ALL FOUR OF THESE USED TO CLOSE ON THE PICTURE, AND NONE ON THE OUTCOME.
   *
   * The old set was PICTURE_SHARED, READS_DIVERGE, UNKNOWNS_REMAIN, NOT_YET - and the first carried
   * the note "any decision now happens outside this ground". So a fortnight of daily check-ins aimed
   * at getting a client back could only ever end by saying everyone agreed on what had happened.
   * Whether the client came back was not something the ground could record.
   *
   * The picture states are kept, because a shock genuinely can end there: sometimes the honest
   * outcome is that the accounts never reconciled, or the facts never landed. What is added is the
   * half that was missing - what happened to the thing you were trying to achieve.
   */
  ACUTE_SHOCK: [
    { value: 'OBJECTIVE_MET', label: 'What we set out to do, done', description: 'The objective set after the first session was achieved, and the record shows what moved and who moved it.' },
    { value: 'PARTLY_RECOVERED', label: 'Partly recovered', description: 'Some of the objective was achieved and some was not. The record shows which parts, and what was still stuck when the fortnight ended.' },
    { value: 'NOT_RECOVERED', label: 'Not recovered', description: 'The objective was not achieved. The record shows what was tried and where it stalled, which is what a decision about what to do next should rest on.' },
    { value: 'OBJECTIVE_OVERTAKEN', label: 'Overtaken by events', description: 'What we were trying to achieve stopped being the right aim partway through. The record shows when that became clear and why.' },
    { value: 'PICTURE_SHARED', label: 'Shared picture established, nothing to recover', description: 'The accounts are on record and agreed, and there was nothing to win back - the event was what it was. No objective was set, deliberately.' },
    { value: 'READS_DIVERGE', label: 'Accounts differ - gaps named', description: 'The accounts never reconciled, so no shared objective could honestly be set. The specific points of divergence are named so the conversation starts there.' },
    { value: 'UNKNOWNS_REMAIN', label: 'Key facts still unknown', description: 'The picture cannot be settled yet because named facts are still missing. Revisit when they land.' },
    { value: 'NOT_YET', label: 'Not yet - more accounts needed' },
  ],
  /**
   * A snapshot cannot "resolve" in the sense the other scenarios do - there is no objective to have
   * been met and no follow-up to schedule. What it can do is say what the read showed, so the lead
   * knows whether to open something that runs.
   */
  SNAPSHOT: [
    { value: 'READ_TAKEN', label: 'Read taken, nothing needs opening', description: 'Everyone answered and nothing in the accounts needs watching over time. The record stands as a snapshot of this week.' },
    { value: 'NEEDS_A_RUN', label: 'Something here needs watching', description: 'The accounts point at something that will not settle on its own. Open the situation that fits it, so there is an objective and a run of check-ins against it.' },
    { value: 'THIN_RESPONSE', label: 'Too few answers to read', description: 'Not enough people answered for the spread to mean anything. Nothing is concluded from what did come in.' },
  ],
};

export function endStatesFor(scenario: GroundScenario) {
  return END_STATES[scenario] ?? [];
}

export function isValidEndState(scenario: GroundScenario, value: string): boolean {
  return endStatesFor(scenario).some((o) => o.value === value);
}

/**
 * OUTCOMES THAT ONLY MEAN SOMETHING IF THERE WAS AN OBJECTIVE.
 *
 * A ground can reach its end without one ever having been set - most often because the first session
 * never produced a checkable statement of what was being worked to, which is itself a finding. Offering
 * "what we set out to do, done" on that ground invites somebody to close it as a success against a
 * target nobody wrote down.
 *
 * Only the ACUTE_SHOCK set has these today, because it is the only scenario whose end states were
 * written in two halves: what happened to the picture, and what happened to the objective. Naming them
 * here rather than inferring from the label keeps it honest - a future outcome state has to be added to
 * this list deliberately.
 */
const NEEDS_AN_OBJECTIVE = new Set([
  'OBJECTIVE_MET',
  'PARTLY_RECOVERED',
  'NOT_RECOVERED',
  'OBJECTIVE_OVERTAKEN',
]);

/**
 * The end states a ground may actually close on.
 *
 * `hadAnObjective` is the caller's to establish - it is a question about the ground's record, not about
 * its scenario. When it is false, the outcome states are withheld and the picture states remain, which
 * is the honest set: the accounts are on record and nothing was being measured.
 */
export function endStatesForGround(
  scenario: GroundScenario,
  opts: { hadAnObjective: boolean },
): { value: string; label: string; description?: string }[] {
  const all = endStatesFor(scenario);
  if (opts.hadAnObjective) return all;
  const kept = all.filter((o) => !NEEDS_AN_OBJECTIVE.has(o.value));
  /**
   * Never strip a scenario down to nothing. If every one of its end states needed an objective, the
   * scenario would become unclosable, which is worse than offering a state that reads oddly.
   */
  return kept.length ? kept : all;
}


/**
 * WHERE ONE PERSON IS THE SUBJECT, THE DECISION IS NOT SHARED.
 *
 * Every ground used to close the same way: both parties pick, and it closes only
 * when they pick the SAME thing. For two cofounders that is exactly right, and
 * the original comment said so - neither of them has authority over the other,
 * and a partnership dispute one person can close alone is a worse product.
 *
 * On a new hire ground it was indefensible. The hire was shown "Let them go" and
 * asked to choose it, and the ground could not close until he picked the same
 * option as his manager. Two things wrong at once: he is handed a choice about
 * his own dismissal, which is a cruel thing to put in front of someone, and he
 * is given a veto over an employment decision that was never his to make.
 *
 * So: the lead proposes and confirms on the scenarios listed here. The other
 * party still SEES the options and what is coming - being closed out without
 * warning would be its own harm - and they keep every other voice they had:
 * their own account, their own corrections, and the record standing beside the
 * lead's. What they no longer get is a button asking them to agree to their own
 * exit.
 *
 * The list is deliberately conservative. Anything not on it keeps both-must-agree,
 * because getting this wrong toward "everyone agrees" only stalls a ground,
 * while getting it wrong toward "the lead decides" takes away someone's say.
 */
export const LEAD_DECIDES: ReadonlySet<GroundScenario> = new Set([
  GroundScenario.NEW_HIRE,          // probation: the employer decides
  GroundScenario.PIP,               // a performance plan the employer runs
  GroundScenario.NEW_MANAGER,       // an engagement the org extends or ends
  GroundScenario.NEW_ADVISOR,       // likewise
  GroundScenario.CONTRACT_RENEWAL,  // renewing is the counterparty's call
  GroundScenario.RECOGNITION,       // granting or declining an ask
]);

/** Does closing this ground need every party to agree, or just the lead? */
export function closingNeedsEveryone(scenario: GroundScenario): boolean {
  return !LEAD_DECIDES.has(scenario);
}
