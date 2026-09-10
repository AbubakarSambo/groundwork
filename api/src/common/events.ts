/**
 * Domain events. Used to decouple modules that would otherwise import each
 * other (e.g. conversation/grounds triggering report generation). Emitters
 * never import the listeners; the listeners live in the reports module.
 */
export const GroundworkEvents = {
  CHECK_IN_COMPLETED: 'checkin.completed',
  /* THE TEAM IS TOLD. Three things the back office wants to hear about the moment they happen: a
     new organisation, a request for the API, a request for a call or coaching. Listened to in
     back-office/the-team-is-told.service.ts. */
  ORG_SIGNED_UP: 'org.signedUp',
  API_ACCESS_ASKED: 'apiAccess.asked',
  CALL_ASKED: 'call.asked',
  /** A session became open to somebody. The moment a host system can tell them, in their own channel. */
  CHECK_IN_OPENED: 'checkin.opened',
  /**
   * EVERY PARTY IS IN FOR A ROUND. Fires once per round, guaranteed by the unique row that records
   * it rather than by anybody remembering to check. This is the event the delivery rule needs -
   * hold a report until the round closes - and it did not exist: the closing rule lived on the
   * client and the server had no idea a round had ended.
   */
  ROUND_COMPLETED: 'round.completed',
  GROUND_ACTIVATED: 'ground.activated',
  /**
   * A HANDOFF WAS NAMED FOR THE FIRST TIME. Only when it clears the board's substance bar, so a
   * passing remark does not become an alert in somebody else's channel.
   */
  BLOCKER_RAISED: 'blocker.raised',
  /** It has been open past the threshold. Fires once per handoff, guaranteed by a stamped column. */
  BLOCKER_ESCALATED: 'blocker.escalated',
  /** A role changed hands and the incoming holder has a brief waiting. */
  HANDOVER_READY: 'handover.ready',
  /** The record suggests a conversation. A human still has to say yes. */
  SCENARIO_PROPOSED: 'scenario.proposed',
} as const;

export interface CheckInCompletedEvent {
  checkInId: string;
  groundId: string;
  participantId: string;
  sessionNumber: number;
}

export interface CheckInOpenedEvent {
  checkInId: string;
  groundId: string;
  participantId: string;
  sessionNumber: number;
  /** The customer's own id for the person, when the roster knows them. Null otherwise. */
  personExternalId: string | null;
}

export interface RoundCompletedEvent {
  groundId: string;
  roundNumber: number;
  /** Who the round was waiting on, as it stood when it closed. */
  participantCount: number;
}

export interface GroundActivatedEvent {
  groundId: string;
}

/**
 * Carries ids and nothing else on purpose. What a handoff is about is verbatim something a person
 * said, and who it sits between names two people - neither belongs in an event that a listener may
 * forward outside the boundary. A listener that needs more can read it under authorisation.
 */
export interface ScenarioProposedEvent {
  candidateId: string;
  organizationId: string;
  scenario: string;
}

export interface HandoverReadyEvent {
  roleAssignmentId: string;
  organizationId: string;
  /** Whether the role genuinely had nothing outstanding - different from a brief that failed. */
  empty: boolean;
}

export interface BlockerEvent {
  blockerId: string;
  groundId: string;
  /** Only on an escalation. */
  waitingDays?: number;
}

/* A plain constant for the one file that may not carry the product's name (see
   nobody-connects-without-being-let-in.spec: no exemption for us anywhere in the access gate). */
export const API_ACCESS_ASKED_EVENT = 'apiAccess.asked';

export interface OrgSignedUpEvent {
  organizationId: string;
  organizationName: string;
  adminEmail: string;
}

export interface ApiAccessAskedEvent {
  organizationId: string;
  askedByUserId: string;
  whatFor: string;
}

export interface CallAskedEvent {
  organizationId: string;
  askedByUserId: string;
  /** CALL, COACHING, HANDS_ON or INTEGRATION. */
  subject: string;
  note: string | null;
}
