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
