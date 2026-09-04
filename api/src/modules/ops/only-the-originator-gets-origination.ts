import { OpsCommercialStage, OpsAttributionState } from '@prisma/client';

/**
 * Who gets credit for a commercial outcome, and who does not.
 *
 * Three sentences carry this whole file, and each of them is a way somebody
 * ends up with credit they did not create:
 *
 *   Company performance is not personal contribution.
 *   Function ownership is not personal attribution.
 *   Operational involvement is not origination.
 *
 * Sahar owns Sales and Market Acquisition. If Hafsah originates a client and
 * Sahar then runs the entire sales process - the follow-up, the proposal, the
 * CRM, the onboarding - the client is still not Sahar's originated client, and
 * her personal target receives nothing from it. That is not a judgement about
 * the value of her work; it is what the word origination means, and there is
 * deliberately no second category for the work she did instead.
 *
 * The absence of a "closer" or a "supported the sale" role is the design. Every
 * such category exists so that somebody can claim a piece of a deal for having
 * been nearby, and each one makes the record less true and the equity
 * conversation it feeds less defensible.
 */

/** Stages at which an opportunity is real enough for attribution to matter. */
export const QUALIFIED_ONWARD: OpsCommercialStage[] = [
  'QUALIFIED',
  'DEMO_DISCOVERY',
  'PROPOSAL',
  'VERBAL_YES',
  'PAYING',
  'RETAINED_3_MONTH',
  'RETAINED_6_MONTH',
  'RETAINED_12_MONTH',
];

/** Stages at which money has actually arrived. */
export const PAYING_ONWARD: OpsCommercialStage[] = [
  'PAYING',
  'RETAINED_3_MONTH',
  'RETAINED_6_MONTH',
  'RETAINED_12_MONTH',
];

export function isQualified(stage: OpsCommercialStage): boolean {
  return QUALIFIED_ONWARD.includes(stage);
}

/**
 * Whether an ordinary user may still change who created this.
 *
 * Locked once qualified, which is the point at which a deal starts being worth
 * claiming. An admin can still change it and every change stays in the history:
 * the aim is to stop retrospective claims, not to stop corrections.
 */
export function attributionIsOpen(opportunity: {
  stage: OpsCommercialStage;
  attributionState: OpsAttributionState;
}): boolean {
  if (opportunity.attributionState === 'APPROVED') return false;
  return !isQualified(opportunity.stage);
}

export interface OpportunityForCredit {
  opportunityOriginatorId: string | null;
  positioningSourceId: string | null;
  attributionState: OpsAttributionState;
  stage: OpsCommercialStage;
}

/**
 * Whether this opportunity counts toward somebody's PERSONAL origination.
 *
 * Only the recorded originator, and only once somebody has approved that it was
 * them. A claim nobody has looked at is not evidence, and the whole reason this
 * system exists is to be evidence.
 *
 * Note what is not consulted: who owns the sales function, who owns the next
 * action, who created the record, who attended the meeting. None of them is an
 * input, because each of them is a way people have historically ended up with
 * credit for a deal somebody else created.
 */
export function countsAsOriginationFor(
  opportunity: OpportunityForCredit,
  personId: string,
): boolean {
  if (opportunity.attributionState !== 'APPROVED') return false;
  return opportunity.opportunityOriginatorId === personId;
}

/** Whether it counts toward somebody's positioning. Same rule, other role. */
export function countsAsPositioningFor(
  opportunity: OpportunityForCredit,
  personId: string,
): boolean {
  if (opportunity.attributionState !== 'APPROVED') return false;
  return opportunity.positioningSourceId === personId;
}

/**
 * The two roles never both pay out to the same person on the same deal.
 *
 * Somebody who opened the door AND generated the opportunity did two things,
 * and both are worth recording - but counting the deal twice in their
 * origination total would overstate exactly what this system exists to measure
 * honestly. Positioning is reported separately from origination everywhere, and
 * this is the rule that keeps them separate.
 */
export function isBothRolesOnOneDeal(opportunity: OpportunityForCredit): boolean {
  return (
    opportunity.opportunityOriginatorId !== null &&
    opportunity.opportunityOriginatorId === opportunity.positioningSourceId
  );
}

/**
 * Why an opportunity has no origination credit, in words.
 *
 * Said rather than left blank, because "no credit" and "nobody has looked at
 * this yet" are different facts and a contributor reading their own ledger
 * deserves to know which.
 */
export function whyNoCredit(opportunity: OpportunityForCredit): string | null {
  if (opportunity.opportunityOriginatorId === null) {
    return 'Nobody has been recorded as having created this. It is not credited to anyone until somebody says who did.';
  }
  if (opportunity.attributionState === 'NEEDS_REVIEW') {
    return 'Waiting for somebody to confirm who created it.';
  }
  if (opportunity.attributionState === 'CLAIMED') {
    return 'Claimed, and not yet approved.';
  }
  if (opportunity.attributionState === 'REJECTED') {
    return 'The claim was not accepted.';
  }
  return null;
}
