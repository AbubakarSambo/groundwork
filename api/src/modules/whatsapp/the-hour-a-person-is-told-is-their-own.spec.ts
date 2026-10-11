import { itOpensSoon } from './what-goes-to-a-phone';
import { theirTimeZone, anHourInTheirZone } from './the-persons-own-time-zone';

/**
 * B-140: Zawadi, on a Kenyan number, was told "Your check-in for Sales team, Q4 opens in an hour, at
 * 3:22 pm." It opened at 14:22 UTC, which is 5:22 pm in Nairobi; 3:22 pm is West Africa time.
 */
const OPENS = new Date('2026-10-08T14:22:00Z');
const ZAWADI = { firstName: 'Zawadi', label: 'Sales team, Q4' };

describe('the hour a person is told is their own, and the zone is named', () => {
  it('is 5:22 pm East Africa Time for a number from Kenya, with no zone on the roster', () => {
    const zone = theirTimeZone(null, '+254700100006');
    expect(zone).toBe('Africa/Nairobi');
    expect(itOpensSoon(ZAWADI, OPENS, false, zone).text).toBe('Hi Zawadi, your check-in for Sales team, Q4 opens in an hour, at 5:22 pm East Africa Time. Reply here when it opens and we\'ll begin.');
  });

  it('is the zone on the roster when there is one, over the number', () => {
    expect(theirTimeZone('Africa/Lagos', '+254700100006')).toBe('Africa/Lagos');
    expect(anHourInTheirZone(OPENS, 'Africa/Lagos')).toMatch(/^3:22 pm West Africa/);
  });

  it('is the platform zone, named, when nothing says where the person is', () => {
    expect(anHourInTheirZone(OPENS, theirTimeZone(null, '+1 202 555 0100'))).toMatch(/^\d{1,2}:22 [ap]m .+/);
    expect(theirTimeZone('not a zone', null)).toBe(theirTimeZone(null, null));
  });

  it('reads the longest calling code first', () => {
    expect(theirTimeZone(null, '254711000000')).toBe('Africa/Nairobi');
    expect(theirTimeZone(null, '27821234567')).toBe('Africa/Johannesburg');
    expect(theirTimeZone(null, '+2348012345678')).toBe('Africa/Lagos');
  });

  it('and the same message without a zone is what it was', () => {
    expect(itOpensSoon(ZAWADI, new Date('2026-10-08T16:00:00Z')).text).toContain('opens in an hour, at 4:00 pm.');
  });
});
