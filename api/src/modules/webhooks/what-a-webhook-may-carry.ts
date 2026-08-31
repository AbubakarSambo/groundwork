/**
 * A WEBHOOK LEAVES THE BOUNDARY AND DOES NOT COME BACK.
 *
 * It lands in a customer's own systems, gets logged by their gateway, forwarded by their alerting,
 * and read by whoever has access to any of that. Whatever we put in it is out, permanently, and the
 * §12.8 exclusions apply here more strictly than anywhere else in the product - not less, because
 * this is the one surface where "it is only visible to admins" stops being true.
 *
 * So a webhook carries A FACT AND A POINTER: something happened, here is which thing, come and look
 * with credentials. It never carries what anybody said, and never carries a judgement about a
 * person. The permalink is where the content lives, behind the authorisation that governs it.
 *
 * These are built by hand rather than serialised from a row, for the same reason the API serialiser
 * is an allow-list: a spread would let every column added later escape by default, and here it
 * would escape into somebody else's logs.
 */

export interface RoundCompletedPayload {
  groundExternalId: string | null;
  groundId: string;
  roundNumber: number;
  participantCount: number;
  completedAt: string;
  permalink: string;
}

export function roundCompletedPayload(args: {
  groundId: string;
  roundNumber: number;
  participantCount: number;
  completedAt: Date;
  appUrl: string;
}): RoundCompletedPayload {
  return {
    /* Null until grounds carry a customer-side id; present in the shape now so adding it later is
       not a breaking change to something their parser already reads. */
    groundExternalId: null,
    groundId: args.groundId,
    roundNumber: args.roundNumber,
    /*
     * A COUNT, NOT A ROSTER. Who was in the round is a list of names leaving the boundary for no
     * reason - the receiver already knows who they invited, and if they do not, the permalink is
     * where to find out under authorisation.
     */
    participantCount: args.participantCount,
    completedAt: args.completedAt.toISOString(),
    permalink: `${args.appUrl.replace(/\/$/, '')}/grounds/${args.groundId}`,
  };
}

export interface CheckInCompletedPayload {
  groundId: string;
  roundNumber: number;
  completedAt: string;
  permalink: string;
}

export function checkInCompletedPayload(args: {
  groundId: string;
  roundNumber: number;
  completedAt: Date;
  appUrl: string;
}): CheckInCompletedPayload {
  return {
    groundId: args.groundId,
    roundNumber: args.roundNumber,
    /*
     * NO PARTICIPANT ID AND NO NAME. "Naomi finished her check-in at 14:12 and Tom has not" is a
     * surveillance feed assembled from timestamps, and it would be assembled by whoever reads their
     * webhook log rather than by anybody who thought about it. The event says a session closed in
     * this round; who it was is not the receiver's business at this layer.
     */
    completedAt: args.completedAt.toISOString(),
    permalink: `${args.appUrl.replace(/\/$/, '')}/grounds/${args.groundId}`,
  };
}

export interface BlockerPayload {
  groundId: string;
  /** Our id for the handoff, so a receiver can tie an escalation back to the raise. */
  blockerId: string;
  /** Only on an escalation. How long it had been open when it crossed the threshold. */
  waitingDays?: number;
  occurredAt: string;
  permalink: string;
}

/**
 * A BLOCKER EVENT CARRIES NEITHER WHAT NOR WHO.
 *
 * This one needs saying because the temptation is unusually strong: a webhook that said "Naomi is
 * blocked on the pricing decision" would be the more useful alert, and it is the obvious thing to
 * build. It is also the single worst payload in this product to let out. The `what` of a handoff is
 * verbatim something a person said about their own work in a check-in, and the two participant ids
 * name who is stuck and who is holding them up - so that message is an account of one named person
 * failing another, landing in a gateway log, forwarded by an alerting rule, read by whoever has
 * access to either. Nobody in that chain agreed to it.
 *
 * The duration goes because a number of days is not an account of anything, and it is the whole
 * reason an escalation is worth sending at all.
 */
export function blockerPayload(args: {
  groundId: string;
  blockerId: string;
  waitingDays?: number;
  occurredAt: Date;
  appUrl: string;
}): BlockerPayload {
  return {
    groundId: args.groundId,
    blockerId: args.blockerId,
    ...(args.waitingDays === undefined ? {} : { waitingDays: args.waitingDays }),
    occurredAt: args.occurredAt.toISOString(),
    permalink: `${args.appUrl.replace(/\/$/, '')}/grounds/${args.groundId}`,
  };
}

export interface HandoverReadyPayload {
  roleAssignmentId: string;
  /** Whether the role had nothing outstanding - different from a brief that failed to build. */
  empty: boolean;
  occurredAt: string;
  permalink: string;
}

/**
 * THE ROLE NAME DOES NOT TRAVEL, AND NOR DOES ANYTHING IN THE BRIEF.
 *
 * "Head of Partnerships changed hands today" in somebody's gateway log is a fact about a person's
 * employment leaving the boundary for no reason - the receiver knows their own org chart. And the
 * brief itself is a list of what is outstanding on a specific desk, which is the last thing that
 * should be forwarded by an alerting rule.
 */
export function handoverReadyPayload(args: {
  roleAssignmentId: string;
  empty: boolean;
  occurredAt: Date;
  appUrl: string;
}): HandoverReadyPayload {
  return {
    roleAssignmentId: args.roleAssignmentId,
    empty: args.empty,
    occurredAt: args.occurredAt.toISOString(),
    permalink: `${args.appUrl.replace(/\/$/, '')}/handovers/${args.roleAssignmentId}`,
  };
}

export interface ScenarioProposedPayload {
  candidateId: string;
  scenario: string;
  occurredAt: string;
  permalink: string;
}

/**
 * THE SCENARIO TRAVELS, THE PERSON AND THE EVIDENCE DO NOT.
 *
 * The kind of conversation is a category and carries nobody. Who it is about, and why, is the exact
 * combination that must not leave: "a performance improvement conversation has been suggested about
 * Naomi, because of these findings" is an accusation, in a gateway log, forwarded by an alerting
 * rule, before a single human has even read it. The permalink is where that lives, behind the
 * authorisation that governs it.
 */
export function scenarioProposedPayload(args: {
  candidateId: string;
  scenario: string;
  occurredAt: Date;
  appUrl: string;
}): ScenarioProposedPayload {
  return {
    candidateId: args.candidateId,
    scenario: args.scenario,
    occurredAt: args.occurredAt.toISOString(),
    permalink: `${args.appUrl.replace(/\/$/, '')}/suggestions/${args.candidateId}`,
  };
}

/**
 * The words a payload must never contain, checked in the spec that guards these builders. Kept here
 * beside the builders so the rule and the thing it governs are read together.
 */
export const NEVER_IN_A_PAYLOAD = [
  'transcript',
  'content',
  'answer',
  'testimony',
  'quote',
  'specificity',
  'verdict',
  'recommendation',
  'score',
] as const;
