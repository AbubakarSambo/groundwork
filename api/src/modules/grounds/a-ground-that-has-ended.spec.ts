import { GroundStatus } from '@prisma/client';
import {
  hasEnded, howItEnded, A_GROUND_IS_OVER, A_GROUND_IS_HELD, isHeld, mayChangeOnItsOwn, whyItRefuses, WHILE_IT_IS_HELD,
} from './a-ground-that-has-ended';

describe('a ground that has ended', () => {
  /*
   * TWO, NOT THREE. STALLED LEFT, AND THAT WAS THE WHOLE BUG.
   *
   * RESOLVED and CLOSED are decisions somebody took. STALLED is what the 3am sweep writes when the
   * time runs out while everybody is busy, and being filed here gave it the one property those two
   * have: no way back. A customer let a few check-ins wait, found them stalled, and had nothing
   * anywhere to reopen them. It is its own state now - shut, but liftable - in
   * A_GROUND_HAS_STOPPED. See a-check-in-that-ran-out-of-time.
   */
  it('names the two decisions and nothing else', () => {
    expect(A_GROUND_IS_OVER).toEqual([GroundStatus.RESOLVED, GroundStatus.CLOSED]);
    for (const live of [GroundStatus.OPEN, GroundStatus.AWAITING_PARTIES, GroundStatus.ACTIVE, GroundStatus.REPORT_READY, GroundStatus.PAUSED, GroundStatus.STALLED]) {
      expect(hasEnded(live)).toBe(false);
    }
    for (const over of A_GROUND_IS_OVER) expect(hasEnded(over)).toBe(true);
  });

  it('is safe about nothing at all', () => {
    expect(hasEnded(null)).toBe(false);
    expect(hasEnded(undefined)).toBe(false);
  });

  it('says how it ended in the words of the decision', () => {
    /* The ending is its own sentence (decision 75, item 48), never a piece after a colon. */
    expect(howItEnded(GroundStatus.CLOSED, 'The new person stays in the role.')).toBe('This check-in has ended. The new person stays in the role.');
    expect(howItEnded(GroundStatus.CLOSED, null)).toBe('This check-in has ended.');
    /* Running out of time is not an ending and no longer speaks in this voice - it has its own
       sentence, which says what lifts it. See whyItRefuses. */
    expect(howItEnded(GroundStatus.STALLED, 'Keep the hire')).toBeNull();
    expect(howItEnded(GroundStatus.ACTIVE, 'Keep the hire')).toBeNull();
  });
});

describe('a ground that is held', () => {
  it('is PAUSED and nothing else, and held is not ended', () => {
    expect(A_GROUND_IS_HELD).toEqual([GroundStatus.PAUSED]);
    expect(isHeld(GroundStatus.PAUSED)).toBe(true);
    for (const s of Object.values(GroundStatus).filter((s) => s !== GroundStatus.PAUSED)) expect(isHeld(s)).toBe(false);
    expect(hasEnded(GroundStatus.PAUSED)).toBe(false);
    expect(isHeld(null)).toBe(false);
  });

  it('may change on its own only while live - not ended, not held, and an unreadable status is live', () => {
    for (const live of [GroundStatus.OPEN, GroundStatus.AWAITING_PARTIES, GroundStatus.ACTIVE, GroundStatus.REPORT_READY, GroundStatus.AWAITING_LEAD, GroundStatus.AWAITING_APPROVAL]) {
      expect(mayChangeOnItsOwn(live)).toBe(true);
    }
    for (const stuck of [...A_GROUND_IS_OVER, ...A_GROUND_IS_HELD]) expect(mayChangeOnItsOwn(stuck)).toBe(false);
    /* The deliberate test-double rule: this file does not fail closed on nothing. */
    expect(mayChangeOnItsOwn(null)).toBe(true);
  });

  it('refuses with the hold sentence while held, the ending sentence once ended, and nothing while live', () => {
    expect(whyItRefuses(GroundStatus.PAUSED, 'Keep the hire')).toBe(WHILE_IT_IS_HELD);
    expect(whyItRefuses(GroundStatus.CLOSED, 'The new person stays in the role.')).toBe('This check-in has ended. The new person stays in the role.');
    /* What every door passes is the stored value with the check-in's kind. A person used to read
       "This check-in ended: keep." Now they read the ending's own sentence, and never the raw value. */
    /* Changed 5 Oct 2026: the KEEP ending names the person where the reader is known, and a door names nobody. */
    expect(whyItRefuses(GroundStatus.CLOSED, 'KEEP', 'anybody else', 'NEW_HIRE')).toBe('This check-in has ended. The person stays in the role.');
    expect(whyItRefuses(GroundStatus.CLOSED, 'KEEP', 'the lead', 'NEW_HIRE')).toBe('This check-in has ended. The person stays in the role.');
    expect(whyItRefuses(GroundStatus.CLOSED, 'ALIGNED', 'anybody else', 'OKR_ALIGNMENT')).toBe('This check-in has ended. The team is on course.');
    expect(whyItRefuses(GroundStatus.CLOSED, 'NOT_A_REAL_ENDING', 'anybody else', 'NEW_HIRE')).toBe('This check-in has ended.');
    expect(whyItRefuses(GroundStatus.ACTIVE)).toBeNull();
  });
});
