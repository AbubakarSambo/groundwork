/**
 * Domain events. Used to decouple modules that would otherwise import each
 * other (e.g. conversation/grounds triggering report generation). Emitters
 * never import the listeners; the listeners live in the reports module.
 */
export const GroundworkEvents = {
  CHECK_IN_COMPLETED: 'checkin.completed',
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
} as const;

export interface CheckInCompletedEvent {
  checkInId: string;
  groundId: string;
  participantId: string;
  sessionNumber: number;
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
