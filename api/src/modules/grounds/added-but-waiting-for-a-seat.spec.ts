import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { whetherThereIsRoomForOneMore, theyAreOnTheCheckInAndWaiting } from './added-but-waiting-for-a-seat';

/**
 * ADDING SOMEBODY WHEN THE ACCOUNT IS FULL.
 *
 * "if enough seats are available, make it so you can add people to a checkin but when exhausted,
 * let me know that they will be added once admin approves and updates seats, so the participants
 * will receive the checkin email only when admin approves in this case."
 *
 * It was wrong in both directions at once. A free check-in refused the person outright, which stops
 * the lead for a reason only somebody else can fix - and the ORG-level cap was never checked on this
 * path at all, so a real organisation ended up with seven active people on a plan whose own Setup
 * tab read "Your plan covers 5 people, including you, and all 5 are taken."
 */
describe('whether there is room for one more', () => {
  it('says yes on an uncapped plan', () => {
    expect(whetherThereIsRoomForOneMore({ seatsTaken: 900, seatsIncluded: null })).toEqual({ room: true });
  });

  it('and yes while a seat is genuinely free', () => {
    expect(whetherThereIsRoomForOneMore({ seatsTaken: 4, seatsIncluded: 5 })).toEqual({ room: true });
  });

  /** At 5 of 5 the sixth person waits: the count already includes everybody holding a seat. */
  it('and no at the cap, not one past it', () => {
    expect(whetherThereIsRoomForOneMore({ seatsTaken: 5, seatsIncluded: 5 }).room).toBe(false);
  });

  it('and no when the account is already over', () => {
    expect(whetherThereIsRoomForOneMore({ seatsTaken: 7, seatsIncluded: 5 }).room).toBe(false);
  });
});

describe('what the lead is told', () => {
  const saying = theyAreOnTheCheckInAndWaiting(5);

  it('says they are on the check-in, because they are', () => {
    expect(saying).toContain('They are on this check-in');
  });

  it('and that nothing has been sent, which is the part that changes what the lead does next', () => {
    expect(saying).toContain('nothing has been sent to them yet');
  });

  it('and names the cap, so the next sentence means something to somebody who did not set the plan', () => {
    expect(saying).toContain('your plan covers 5 people');
  });

  it('and says who has to act and what happens then', () => {
    expect(saying).toContain('An admin here has to make room');
    expect(saying).toContain('goes out the moment that happens');
  });

  /** They were never written to, so from where they stand nothing has happened. */
  it('and that the person is told none of it', () => {
    expect(saying).toContain('they are not told any of this');
  });
});

describe('the service adds them rather than refusing', () => {
  const SRC = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('asks the seat question before creating the row', () => {
    expect(SRC).toMatch(/waitingForASeat = whetherThereIsRoomForOneMore\(\{ seatsTaken, seatsIncluded \}\)/);
  });

  /** An existing member already holds a seat; adding them to a second check-in costs nothing. */
  it('and only asks it about somebody who would need a seat', () => {
    expect(SRC).toMatch(/const alreadyHereWithASeat = await this\.prisma\.user\.count\(/);
    expect(SRC).toMatch(/if \(!alreadyHereWithASeat\) \{/);
  });

  it('and adds them anyway, marked', () => {
    expect(SRC).toMatch(/awaitingSeat: !waitingForASeat\.room/);
  });

  it('and holds the mail, so nothing reaches somebody who could not open it', () => {
    expect(SRC).toMatch(/if \(!startsInFuture && !heldForApproval && waitingForASeat\.room\) \{/);
  });

  /**
   * FOUND BY DRIVING IT. The row came back `invitedAt` stamped while no mail had gone - the exact
   * mismatch the neighbouring spec warns about, in reverse: the lead would believe somebody had
   * been written to who has never heard from us.
   */
  it('and does not claim they were invited or notified', () => {
    expect(SRC).toMatch(/invitedAt: startsInFuture \|\| heldForApproval \|\| !waitingForASeat\.room \? null : new Date\(\)/);
    expect(SRC).toMatch(/notifiedAt: startsInFuture \|\| heldForApproval \|\| !waitingForASeat\.room \? null : new Date\(\)/);
  });

  it('and hands the lead the sentence rather than an error', () => {
    expect(SRC).toMatch(/\.\.\.\(waitingForASeat\.room \? \{\} : \{ saying: waitingForASeat\.saying \}\)/);
  });
});

describe('and the invitations go out when an admin makes room', () => {
  const SRC = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('oldest first, because a queue answered out of order is not a queue', () => {
    /* Changed 7 October 2026 (known issue B5): not into a check-in that is over, stopped, paused, waiting for an admin or declined. */
    expect(SRC).toMatch(/where: \{ awaitingSeat: true, ground: \{ organizationId, status: \{ notIn: \[\.\.\.A_GROUND_THE_JOBS_LEAVE_ALONE, \.\.\.A_GROUND_IS_HELD, GroundStatus\.AWAITING_APPROVAL\] \} \} \},\s*\n\s*orderBy: \{ createdAt: 'asc' \}/);
  });

  /** Releasing six into four seats would put the account straight back over its cap. */
  it('and only as many as there is room for', () => {
    expect(SRC).toMatch(/const room = await this\.billing\.seatsLeft\(organizationId\)/);
    expect(SRC).toMatch(/const canSend = room === null \? waiting\.length : Math\.max\(0, room\)/);
  });

  it('and clears the flag only for the ones that actually sent', () => {
    expect(SRC).toMatch(/data: \{ awaitingSeat: false, invitedAt: new Date\(\) \}/);
  });

  /** One bad address must not strand the rest of the queue behind it. */
  it('and one failure does not stop the others', () => {
    const method = SRC.slice(SRC.indexOf('async releaseAnyoneWaitingForASeat'));
    expect(method.slice(0, method.indexOf('\n  async ', 10))).toMatch(/catch \(e: any\) \{/);
  });
});
