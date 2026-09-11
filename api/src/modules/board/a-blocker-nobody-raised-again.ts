/**
 * A BLOCKER NOBODY HAS RAISED SINCE IS NOT STILL BLOCKING.
 *
 * A handoff row is written when somebody says they are waiting on something, and cleared when they
 * say they are not. Between those two, nothing. So a blocker named in session one and resolved
 * quietly in session two stays open for the life of the ground: the closing report of a four
 * session run said "waiting for 6 things, starting with introductions" about introductions that had
 * happened in week six.
 *
 * The record cannot say the blocker is gone - nobody said so. It can say nobody has mentioned it
 * since, which is the honest version and the one a lead can act on. A row stays current while the
 * person who raised it has not completed a later session without restating it.
 */

export interface RaisedThing {
  /** Who is waiting. */
  fromParticipantId: string;
  /** The session it was last stated in, from the check-in it came out of. */
  statedInSession: number | null;
}

/** The last session each person has completed. Anything older that was not restated is stale. */
export type LatestSessionByPerson = Map<string, number>;

export function stillRaised<T extends RaisedThing>(rows: T[], latest: LatestSessionByPerson): T[] {
  return rows.filter((r) => isStillRaised(r, latest));
}

export function notRaisedAgain<T extends RaisedThing>(rows: T[], latest: LatestSessionByPerson): T[] {
  return rows.filter((r) => !isStillRaised(r, latest));
}

function isStillRaised(r: RaisedThing, latest: LatestSessionByPerson): boolean {
  /* No session on the row means it came from somewhere other than a check-in; it stands. */
  if (r.statedInSession == null) return true;
  const theirLast = latest.get(r.fromParticipantId);
  if (theirLast == null) return true;
  return r.statedInSession >= theirLast;
}

/** What to say about the ones that have gone quiet, or nothing when there are none. */
export function sayingWhatWentQuiet(count: number): string | null {
  if (count <= 0) return null;
  return count === 1
    ? 'One thing somebody was waiting on has not been raised since. It may be resolved; nobody has said so.'
    : `${count} things people were waiting on have not been raised since. They may be resolved; nobody has said so.`;
}
