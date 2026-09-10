import { GroundStatus } from '@prisma/client';
import { hasEnded, howItEnded, A_GROUND_IS_OVER } from './a-ground-that-has-ended';

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
