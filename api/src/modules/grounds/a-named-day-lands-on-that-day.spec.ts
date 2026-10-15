import { whenTheNextSessionOpens } from './the-check-ins-own-schedule';

/**
 * Walk fault 5: "every Monday" must land on a Monday in the organisation's own time zone, not on the
 * Sunday the check-in was set up. Set up on Sunday 11 October 2026 in Nairobi and in Lagos.
 */
describe('a check-in set for Mondays', () => {
  for (const zone of ['Africa/Nairobi', 'Africa/Lagos']) {
    it(`opens its next session on a Monday in ${zone}`, () => {
      const startedAt = new Date('2026-10-11T07:00:00Z');
      const next = whenTheNextSessionOpens({ cadence: 'WEEKLY' as any, anchorDay: 1, workingDays: [1, 2, 3, 4, 5], startedAt, zone }, startedAt, startedAt);
      const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: zone }).format(next);
      expect(weekday).toBe('Monday');
    });
  }
  it('without the day she named, it would have been the Sunday it was set up (the fault)', () => {
    const startedAt = new Date('2026-10-11T07:00:00Z');
    const next = whenTheNextSessionOpens({ cadence: 'WEEKLY' as any, anchorDay: null, workingDays: null, startedAt, zone: 'Africa/Nairobi' }, startedAt, startedAt);
    expect(new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'Africa/Nairobi' }).format(next)).toBe('Sunday');
  });
});
