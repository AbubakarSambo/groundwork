import { GroundStatus } from '@prisma/client';
import {
  hasEnded, howItEnded, A_GROUND_IS_OVER, A_GROUND_IS_HELD, isHeld, mayChangeOnItsOwn, whyItRefuses, WHILE_IT_IS_HELD,
} from './a-ground-that-has-ended';

describe('a ground that has ended', () => {
  it('names the three terminal statuses and nothing else', () => {
    expect(A_GROUND_IS_OVER).toEqual([GroundStatus.RESOLVED, GroundStatus.CLOSED, GroundStatus.STALLED]);
    for (const live of [GroundStatus.OPEN, GroundStatus.AWAITING_PARTIES, GroundStatus.ACTIVE, GroundStatus.REPORT_READY, GroundStatus.PAUSED]) {
      expect(hasEnded(live)).toBe(false);
    }
    for (const over of A_GROUND_IS_OVER) expect(hasEnded(over)).toBe(true);
  });

  it('is safe about nothing at all', () => {
    expect(hasEnded(null)).toBe(false);
    expect(hasEnded(undefined)).toBe(false);
  });

  it('says how it ended in the words of the decision', () => {
    expect(howItEnded(GroundStatus.CLOSED, 'Keep the hire')).toBe('This check-in ended: keep the hire.');
    expect(howItEnded(GroundStatus.CLOSED, null)).toBe('This check-in has ended.');
    expect(howItEnded(GroundStatus.STALLED, 'Keep the hire')).toBe('This check-in stopped without an agreed end.');
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
    expect(whyItRefuses(GroundStatus.CLOSED, 'Keep the hire')).toBe('This check-in ended: keep the hire.');
    expect(whyItRefuses(GroundStatus.ACTIVE)).toBeNull();
  });
});
