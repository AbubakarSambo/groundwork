import { Cadence } from '@prisma/client';
import { whenTheirNextCheckInWouldOpen } from './when-their-next-check-in-opens';

/**
 * "YOUR NEXT CHECK-IN OPENS TOMORROW AT 8AM", BEFORE THE NEXT ONE EXISTS (sales-first.md, section 5). Read from the
 * schedule without writing anything, with the same reasons for there being none as ConversationService.ensureNextSession.
 */
const DAILY = {
  status: 'ACTIVE', cadence: Cadence.DAILY, workingDays: [1, 2, 3, 4, 5],
  startsAt: new Date('2026-09-14T00:00:00.000Z'), endsAt: new Date('2026-11-30T00:00:00.000Z'), timelineDays: 90,
};
const THURSDAY = { sessionNumber: 23, availableFrom: new Date('2026-10-15T13:00:00.000Z') };
const NOW = new Date('2026-10-15T14:30:00.000Z');

describe('when their next check-in would open', () => {
  it('a daily check-in opens the next working day at 8 in the morning, in the organisation’s zone', () => {
    expect(whenTheirNextCheckInWouldOpen(DAILY, { partyType: 'PARTICIPANT' }, THURSDAY, 'Africa/Lagos', NOW)?.toISOString()).toBe('2026-10-16T07:00:00.000Z');
    expect(whenTheirNextCheckInWouldOpen(DAILY, { partyType: 'PARTICIPANT' }, THURSDAY, 'Africa/Nairobi', NOW)?.toISOString()).toBe('2026-10-16T05:00:00.000Z');
  });
  it('none for a lead, who checks in when they choose', () =>
    expect(whenTheirNextCheckInWouldOpen(DAILY, { partyType: 'INITIATOR' }, THURSDAY, 'Africa/Lagos', NOW)).toBeNull());
  it('none for a check-in answered once, or one that waits for its lead', () => {
    expect(whenTheirNextCheckInWouldOpen({ ...DAILY, cadence: Cadence.ONE_TIME }, { partyType: 'PARTICIPANT' }, THURSDAY, 'Africa/Lagos', NOW)).toBeNull();
    expect(whenTheirNextCheckInWouldOpen({ ...DAILY, cadence: Cadence.SEQUENTIAL }, { partyType: 'PARTICIPANT' }, THURSDAY, 'Africa/Lagos', NOW)).toBeNull();
  });
  it('none after the closing session, or past the end date, or once the check-in has ended', () => {
    expect(whenTheirNextCheckInWouldOpen(DAILY, { partyType: 'PARTICIPANT' }, { ...THURSDAY, isFinal: true }, 'Africa/Lagos', NOW)).toBeNull();
    expect(whenTheirNextCheckInWouldOpen({ ...DAILY, endsAt: new Date('2026-10-16T06:00:00.000Z') }, { partyType: 'PARTICIPANT' }, THURSDAY, 'Africa/Lagos', NOW)).toBeNull();
    expect(whenTheirNextCheckInWouldOpen({ ...DAILY, status: 'CLOSED' }, { partyType: 'PARTICIPANT' }, THURSDAY, 'Africa/Lagos', NOW)).toBeNull();
  });
});
