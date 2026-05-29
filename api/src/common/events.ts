/**
 * Domain events. Used to decouple modules that would otherwise import each
 * other (e.g. conversation/grounds triggering report generation). Emitters
 * never import the listeners; the listeners live in the reports module.
 */
export const GroundworkEvents = {
  CHECK_IN_COMPLETED: 'checkin.completed',
  GROUND_ACTIVATED: 'ground.activated',
} as const;

export interface CheckInCompletedEvent {
  checkInId: string;
  groundId: string;
  participantId: string;
  sessionNumber: number;
}

export interface GroundActivatedEvent {
  groundId: string;
}
