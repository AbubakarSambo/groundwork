import { Cadence } from '@prisma/client';
import { whenTheNextSessionOpens, theHourACheckInOpens } from './the-check-ins-own-schedule';
import { whenItOpensSaid } from '../assistant/about-your-check-ins-and-the-company';

/**
 * Channel test, 20 November 2026, W27. Chidi's weekly check-in said "opens on Friday 27 November at 12am" and Ask said "opens on 26 November
 * 2026" for the same session: the weekly round opened at midnight in Nairobi (21:00 the day before in UTC), and Ask counted the day in
 * another zone and gave no hour. Every rhythm now opens at 8 where the team is, and Ask says it the way the check-in does.
 */
const NAIROBI = 'Africa/Nairobi';
const SALES_Q4 = { cadence: Cadence.WEEKLY, anchorDay: 5, startedAt: new Date('2026-11-06T05:00:00Z'), zone: NAIROBI };

describe('the next check-in is one date, at 8 where the team is', () => {
  it('a weekly Friday check-in opens its next session at 8am in Nairobi, not at midnight', () => {
    const next = whenTheNextSessionOpens(SALES_Q4, new Date('2026-11-20T05:00:00Z'), new Date('2026-11-20T07:56:46Z'));
    expect(next.toISOString()).toBe('2026-11-27T05:00:00.000Z');
  });

  it('every rhythm with a next session opens at 8; one that opens when the lead checks in, or only once, has no hour', () => {
    for (const c of [Cadence.DAILY, Cadence.WEEKLY, Cadence.FORTNIGHTLY, Cadence.MONTHLY]) expect(theHourACheckInOpens(c)).toBe(8);
    expect(theHourACheckInOpens(Cadence.SEQUENTIAL)).toBeNull();
    expect(theHourACheckInOpens(Cadence.ONE_TIME)).toBeNull();
  });

  it('Ask says the same day and hour as the check-in, as Chidi reads it on Friday 20 November', () => {
    const now = new Date('2026-11-20T07:57:00Z');
    expect(`Your next check-in in "Sales team, Q4" opens ${whenItOpensSaid(new Date('2026-11-27T05:00:00Z'), now, NAIROBI)}.`)
      .toBe('Your next check-in in "Sales team, Q4" opens on Friday 27 November at 8am.');
    expect(whenItOpensSaid(new Date('2026-11-21T05:00:00Z'), now, NAIROBI)).toBe('tomorrow at 8am');
  });
});
