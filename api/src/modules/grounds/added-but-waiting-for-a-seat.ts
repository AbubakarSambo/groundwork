/**
 * ADDING SOMEBODY WHEN THE ACCOUNT IS FULL.
 *
 * "if enough seats are available, make it so you can add people to a checkin but when exhausted,
 * let me know that they will be added once admin approves and updates seats, so the participants
 * will receive the checkin email only when admin approves in this case."
 *
 * WHAT IT USED TO DO, IN BOTH DIRECTIONS AT ONCE.
 *
 * A free check-in refused the person outright - `freeSeatLimitMessage`, thrown - which stops the
 * lead mid-sentence for a reason they usually cannot fix, because the person who can upgrade is
 * somebody else and is not in the room. And the ORG-level cap was never checked on this path at
 * all: `canInviteMember` had one caller, in the auth service, so adding people through a check-in
 * skipped it. Walked on a real organisation, that produced seven active people on a plan whose own
 * Setup tab read "Your plan covers 5 people, including you, and all 5 are taken."
 *
 * WHAT IT DOES NOW. Room, and nothing changes: the person is added and written to. No room, and the
 * person is still added - the row exists, the lead sees them on the roster marked as waiting - and
 * NOTHING IS SENT. An invitation to a check-in somebody cannot open is worse than silence: they
 * follow it, they are told they need approval, and they have learned only that they are in the way.
 *
 * The invitation goes out when an admin makes room. That is the same admin, the same queue, and one
 * more thing in it.
 */

export interface WhetherThereIsRoom {
  /** People currently holding a seat on the account. */
  seatsTaken: number;
  /** What the plan covers. Null means uncapped. */
  seatsIncluded: number | null;
}

export type SeatAnswer =
  | { room: true }
  | { room: false; saying: string };

/**
 * Whether one more person fits.
 *
 * An uncapped plan always has room. Otherwise a seat has to be free BEFORE the person is added:
 * `seatsTaken` already counts everybody who holds one, so the test is a comparison and not an
 * off-by-one - at 5 of 5, the sixth person waits.
 */
export function whetherThereIsRoomForOneMore(counts: WhetherThereIsRoom): SeatAnswer {
  if (counts.seatsIncluded === null) return { room: true };
  if (counts.seatsTaken < counts.seatsIncluded) return { room: true };
  return {
    room: false,
    saying: theyAreOnTheCheckInAndWaiting(counts.seatsIncluded),
  };
}

/**
 * What the LEAD is told. It has to say three things and no more: they are on the check-in, nothing
 * has been sent to them, and what has to happen. Naming the cap matters - "your plan covers 5" is
 * what makes the next sentence make sense to somebody who did not set the plan up.
 */
export function theyAreOnTheCheckInAndWaiting(seatsIncluded: number): string {
  return `They are on this check-in, but your plan covers ${seatsIncluded} people and those are taken, `
    + 'so nothing has been sent to them yet. An admin here has to make room - by freeing a seat or '
    + 'moving to a larger plan - and their invitation goes out the moment that happens. You do not '
    + 'have to do anything else, and they are not told any of this.';
}

/** What the ROW says on the roster, so the lead can see at a glance who is in this state. */
export const WAITING_FOR_A_SEAT = 'Waiting for a seat';

/**
 * What the person is told when the invitation finally reaches them - which is nothing about any of
 * this. They were never written to, so from where they stand they have simply been invited.
 */
export const NOTHING_TO_EXPLAIN_TO_THEM = true;
