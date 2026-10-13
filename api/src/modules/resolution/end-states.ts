import { GroundScenario } from '@prisma/client';

/**
 * The end states each scenario builds toward (Part 8 / moment selector).
 *
 * WHO CLOSES ONE: the lead, on every scenario. It used to depend on who the parties were to each
 * other - two peers had to agree, and the decision belonged to the lead only where one person's
 * position was what the check-in was about. Her call, 24 September 2026: "the lead is meant to
 * close it, nothing like agreement." See closingNeedsEveryone below.
 */
export const END_STATES: Record<GroundScenario, { value: string; label: string; description?: string }[]> = {
  ROLE_HANDOVER: [
    { value: 'HANDED_OVER', label: 'The work has been handed over.' },
    { value: 'GAPS_REMAIN', label: 'The work has been handed over, and what was not passed on is named.', description: 'The successor has it, and both sides named what was not transferred rather than pretending it was.' },
    { value: 'NEEDS_MORE_TIME', label: 'The handover is not finished, so it is given more time.' },
    { value: 'PREDECESSOR_GONE', label: 'The person handing over left before the handover was finished.', description: 'They left before this finished. Recorded honestly so the gaps are attributed to the circumstance rather than to the successor.' },
  ],
  /**
   * IT ENDS WHEN THE CONTRACT IS SIGNED, and the other three endings are the honest ones.
   *
   * A review that produces "signed" is the good outcome; a review that produces "we found out we
   * mean different things and stopped" is a better outcome than signing anyway, and it has to be
   * available or nobody will pick it.
   */
  CONTRACT_REVIEW: [
    { value: 'SIGNED', label: 'The contract is signed.' },
    { value: 'SIGNED_WITH_CHANGES', label: 'The contract is signed, with the changes written into it.', description: 'The review surfaced things the draft did not say, and they were written in before signing.' },
    { value: 'NOT_YET', label: 'The contract is not ready to sign, and the open questions are named.' },
    { value: 'NOT_PROCEEDING', label: 'The two sides are not going ahead with the contract.', description: 'The two sides found they meant different things by it. Better found now than in a year.' },
  ],
  /**
   * MOST OF THESE ARE "IT IS RUNNING FINE", which is the point of the card. An ending that only
   * offered dispute-shaped outcomes would make a quiet quarter feel like a failure to conclude.
   */
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
  /* The anchor's own endings (decision 121, item 2): the four ways the month goes on, from the end-of-month page, and the one where it ends here. */
  HELP_TEAM_UNDERSTAND: [
    { value: 'KEEP_RUNNING', label: 'The check-in keeps running, so the team keeps being asked.' },
    { value: 'START_RECOMMENDED', label: 'The check-ins Groundwork recommended are started.' },
    { value: 'TURN_ON_SUITES', label: 'The suites that fit the work the team is already doing are turned on.' },
    { value: 'CONTINUE_FOR_THE_TEAM', label: 'Groundwork carries on for the team.' },
    { value: 'ENDS_HERE', label: 'The check-in ends here, and what the month found stays in the record.' },
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
    /* The prototype's three outcomes for this kind of check-in are "On course", "Reach it with a change" and "Change the target"
       (request 130 f, G1-example-check-ins/ops.txt). Said as full sentences, as decision 75 item 48 asks. */
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
  /**
   * Deliberately the plainest set in the product. OPEN_READ is used when the shape was not known at
   * the start, so its endings cannot presume one - no renew, no separate, no keep or let go.
   */
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
   * A snapshot cannot "resolve" in the sense the other scenarios do - there is no objective to have
   * been met and no follow-up to schedule. What it can do is say what the read showed, so the lead
   * knows whether to open something that runs.
   */
  /**
   * A STANDING UPDATE DOES NOT RESOLVE. IT STOPS, OR IT TURNS INTO SOMETHING.
   *
   * There is no objective to have been met - the lead wrote one line and asked for an answer to it
   * on a rhythm. So the endings are the three honest things that happen to a standing update: it
   * has done its job and can stop, something in the answers needs more than an update, or people
   * stopped replying and there is nothing to read.
   */
  TEAM_UPDATES: [
    { value: 'STILL_RUNNING', label: 'The update keeps running.' },
    { value: 'DONE_WITH_IT', label: 'The update stops, because it has done its job.', description: 'The question has been answered enough times that the lead knows what they wanted to know.' },
    { value: 'NEEDS_A_RUN', label: 'Something here needs more than an update.', description: 'The answers point at something that will not settle by being asked again. Open the situation that fits it, so there is an objective and a run of check-ins against it.' },
    { value: 'THIN_RESPONSE', label: 'People stopped answering.', description: 'Too few replies for the picture to mean anything. Nothing is concluded from what did come in, and the honest read is about the rhythm rather than the people.' },
  ],
  /**
   * A DISCOVERY SESSION ENDS ON A DIRECTION OR ON TOO LITTLE TO CALL ONE.
   *
   * Nothing here is an outcome for the people who answered: they were asked what they know, not
   * held to anything. So the end states are about what the group produced, which is the only thing
   * this session was for.
   */
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

/**
 * EVERY ENDING IS ONE PLAIN, FULL SENTENCE (decision 75, item 48, 2 October 2026).
 *
 * The labels above were pieces: "OKRs aligned to company direction", "Gaps identified - revision
 * needed", "Descope". They are read on the resolution panel, on the board's "Where this is heading",
 * when a check-in has ended, in the review that follows, and in the email that says it closed, so they
 * are written here once, each as one sentence that says what happened, and every one of those places
 * reads them from here. One sentence each, so "The outcome is that ..." can carry any of them.
 */
/**
 * WHEN SOMEBODY LEAVES A ROLE, THE ENDING NAMES THEM (request 123 item 8; Hafsah, 5 October 2026).
 *
 * "The new person leaves the role." said who left as a category. The prototype's ending says
 * "The role doesn't continue. His history stays as it is." (B6-ending-a-check-in), and Hafsah chose
 * that sentence with the person's name in it. Two sentences, because the second one is the point:
 * nothing the person did or said is taken away.
 *
 * No pronoun is guessed from a name, and the record holds none, so the name is said twice rather
 * than "his" or "her". The person reading about themselves reads "Your". With no name this reader
 * may see, it stays neutral: "The role does not continue. The person's history stays as it is."
 * The name comes only through `whoTheEndingIsAbout` (who-the-ending-is-about.ts), which reads the
 * same `namesVisibleTo` every other surface of the check-in reads.
 */
export interface TheEndingIsAbout {
  /** The first name this reader may see, or null where they may not see one. */
  name?: string | null;
  /** True where the reader is the person the ending is about. */
  isTheReader?: boolean;
}

/*
 * AND WHEN THEY STAY, THE SAME (reviewer, 5 October 2026): "Kwame stays in the role." to the lead, "You stay
 * in the role." to Kwame, "The person stays in the role." where no name may be read. The other new-hire
 * endings ("The role is set up differently.", "The time to decide is made longer.") name nobody and are true
 * as they are, so they are left alone.
 */
export function theyStayInTheRole(who?: TheEndingIsAbout | null): string {
  if (who?.isTheReader) return 'You stay in the role.';
  const name = who?.name?.trim();
  return name ? `${name} stays in the role.` : 'The person stays in the role.';
}

const ABOUT_ONE_PERSON: Record<string, (who?: TheEndingIsAbout | null) => string> = {
  'NEW_HIRE:EXIT': (who) => theRoleDoesNotContinue(who),
  'DRIFT:EXIT': (who) => theRoleDoesNotContinue(who),
  'NEW_HIRE:KEEP': (who) => theyStayInTheRole(who),
};

export function theRoleDoesNotContinue(who?: TheEndingIsAbout | null): string {
  if (who?.isTheReader) return 'Your role does not continue. Your history stays as it is.';
  const name = who?.name?.trim();
  if (name) return `${name}'s role does not continue. ${name}'s history stays as it is.`;
  return "The role does not continue. The person's history stays as it is.";
}

function asReadBy(scenario: GroundScenario | string | null | undefined, o: { value: string; label: string; description?: string }, who?: TheEndingIsAbout | null) {
  const said = ABOUT_ONE_PERSON[`${scenario}:${o.value}`];
  return said ? { ...o, label: said(who) } : o;
}

/** The ending's own sentence on a check-in of this kind, or null where it is not one of its endings. */
export function theEndingSaid(scenario: GroundScenario | string | null | undefined, value: string | null | undefined, who?: TheEndingIsAbout | null): string | null {
  if (!value) return null;
  const mine = scenario ? END_STATES[scenario as GroundScenario] : undefined;
  const found = (mine ?? []).find((o) => o.value === value) ?? (scenario === 'HELP_TEAM_UNDERSTAND' ? ONCE_OFFERED_BY_THE_ANCHOR.map(([v, label]) => ({ value: v, label })).find((o) => o.value === value) : undefined);
  return found ? asReadBy(scenario, found, who).label : null;
}

/** "The outcome is that the project carries on." from "The project carries on." */
export function theOutcomeIsThat(label: string): string {
  const t = label.trim().replace(/[.\s]+$/, '');
  /* Every ending starts with an ordinary word, so its first letter can be lowered, except the one that
     starts with the name of the person leaving ("Kwame's role does not continue."). A name keeps its capital. */
  const startsWithAName = /^\S+['\u2019]s\s/u.test(t) || /^\S+ stays in the role$/u.test(t);
  const lowered = !startsWithAName && /^\p{Lu}(?:\p{Ll}|\s)/u.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t;
  return `The outcome is that ${lowered}.`;
}

/** The endings of this kind of check-in, as this reader reads them. Without `who`, the neutral wording. */
export function endStatesFor(scenario: GroundScenario, who?: TheEndingIsAbout | null) {
  return (END_STATES[scenario] ?? []).map((o) => asReadBy(scenario, o, who));
}

export function isValidEndState(scenario: GroundScenario, value: string): boolean {
  return endStatesFor(scenario).some((o) => o.value === value);
}

/**
 * THE ENDINGS THIS KIND OF CHECK-IN USED TO OFFER, still read where one was already chosen (decision 121, item 2). The anchor's
 * check-ins used to be offered a project's four endings, so an ending already written with one of them still says what it said.
 */
const ONCE_OFFERED_BY_THE_ANCHOR: [string, string][] = [
  ['COMPLETE', 'The project is complete.'],
  ['CONTINUE', 'The project carries on.'],
  ['DESCOPE', 'The project carries on with less in it.'],
  ['STOP', 'The project stops.'],
];

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
  opts: { hadAnObjective: boolean; who?: TheEndingIsAbout | null },
): { value: string; label: string; description?: string }[] {
  const all = endStatesFor(scenario, opts.who);
  if (opts.hadAnObjective) return all;
  const kept = all.filter((o) => !NEEDS_AN_OBJECTIVE.has(o.value));
  /**
   * Never strip a scenario down to nothing. If every one of its end states needed an objective, the
   * scenario would become unclosable, which is worse than offering a state that reads oddly.
   */
  return kept.length ? kept : all;
}


/**
 * THE LEAD CLOSES IT. THERE IS NO AGREEMENT STEP.
 *
 * Hafsah, 24 September 2026: "the lead is meant to close it, nothing like agreement."
 *
 * Every check-in used to close only when every active party picked the SAME end state, and nobody
 * could close one alone. That was in the first commit this repo has, and in August six scenarios
 * were carved out of it - new hire, PIP, new manager, new advisor, contract renewal, recognition -
 * because on a new-hire ground the hire was shown "Let them go" and asked to choose it, which is a
 * cruel thing to put in front of somebody and a veto over a decision that was never theirs.
 *
 * The carve-out was the right instinct about the wrong rule. Whoever called the check-in is the
 * person who has to act on how it ends, and making that wait on unanimity does not give anybody a
 * voice - it gives everybody a veto, and a check-in nobody will close is a record that quietly
 * stops being used. Eighteen grounds, two hundred and sixty-five finished check-ins, and not one
 * of them ever closed.
 *
 * WHAT A PARTICIPANT KEEPS, WHICH IS EVERYTHING EXCEPT THE VETO. They see the options and what is
 * coming, so nobody is closed out without warning. Their own account stands on the record beside
 * the lead's, they can still correct it, and the report is still read by everybody at the same
 * moment - what they never had, and this does not give them, is a ruling of their own.
 */
export const LEAD_DECIDES_EVERYWHERE = true;

/**
 * Does closing this check-in need every party to agree? No - the lead closes it.
 *
 * Kept as a function rather than deleted, because four call sites read it and a constant `false`
 * inlined at each of them is four places to disagree later. It takes the scenario it no longer uses
 * for the same reason: every caller already has one, and the day a scenario genuinely needs
 * unanimity this is the one line that changes.
 */
export function closingNeedsEveryone(_scenario: GroundScenario): boolean {
  return false;
}
