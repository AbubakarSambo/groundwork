import { Cadence } from '@prisma/client';
import { whenItIsDue } from '../whatsapp/what-goes-to-a-phone';
import { whenTheNextSessionOpens, howManyRoundsUpTo } from './the-check-ins-own-schedule';
import { deadlineOf } from './when-the-clock-starts';
import { theYearIfNotThisOne, aDayInItsZone } from '../board/a-day-said-in-full';
import { eachQuestionOnce, aDirectionPastItsDay, theDayAnAimIsBy } from './today-says-each-thing-once';
import { isAPublicHoliday } from './public-holidays';

/**
 * EVERY "DUE", "UNTIL" AND "BY" COMES FROM THE CALENDAR (fix plan, pattern 4; quarter test, October 2026 to January 2027). The whole
 * pattern: a day worked out by adding days to a date, or read without the team's days, the holidays, the zone, the year or the end of
 * the day. Each case below is one the quarter found.
 */
const WEEKDAYS = [1, 2, 3, 4, 5];
const NAIROBI = 'Africa/Nairobi';

describe('due, opens and ends come from the check-in’s own calendar', () => {
  it('a weekday check-in opened on Friday is due on Monday at 8, never "tomorrow, Saturday"', () => {
    const due = whenItIsDue('2026-11-20T05:00:00Z', { cadence: 'DAILY', workingDays: WEEKDAYS, startsAt: '2026-10-12T05:00:00Z' }, NAIROBI)!;
    expect(due.toISOString()).toBe('2026-11-23T05:00:00.000Z');
  });

  it('no session opens on Christmas Day or Boxing Day: the round of the 24th runs to the 28th', () => {
    const s = { cadence: Cadence.DAILY, workingDays: WEEKDAYS, startedAt: new Date('2026-10-12T05:00:00Z'), zone: NAIROBI };
    expect(whenTheNextSessionOpens(s, new Date('2026-12-24T05:00:00Z'), new Date('2026-12-24T09:00:00Z')).toISOString()).toBe('2026-12-28T05:00:00.000Z');
    expect(isAPublicHoliday(Date.UTC(2026, 11, 25), NAIROBI)).toBe(true);
    expect(isAPublicHoliday(Date.UTC(2026, 11, 12), 'Africa/Lagos')).toBe(false);
  });

  it('the count of sessions leaves the holidays out (Christmas Day is a Friday in 2026; Boxing Day is a Saturday)', () => {
    const withThem = howManyRoundsUpTo({ cadence: Cadence.DAILY, workingDays: WEEKDAYS }, Date.UTC(2026, 11, 21), Date.UTC(2026, 11, 31));
    const without = howManyRoundsUpTo({ cadence: Cadence.DAILY, workingDays: WEEKDAYS, zone: NAIROBI } as any, Date.UTC(2026, 11, 21), Date.UTC(2026, 11, 31));
    expect(withThem - without).toBe(1);
  });

  it('a check-in "until 30 October" runs to the end of 30 October', () => {
    const end = deadlineOf({ createdAt: new Date('2026-10-12'), startsAt: null, timelineDays: 18, endsAt: new Date('2026-10-30T00:00:00.000Z') } as any)!;
    expect(end.getTime()).toBeGreaterThan(new Date('2026-10-30T20:00:00Z').getTime());
    expect(end.getTime()).toBeLessThan(new Date('2026-10-31T00:00:00Z').getTime());
  });

  it('a day in another year says its year: "12 October 2027", read in 2026', () => {
    expect(aDayInItsZone(new Date('2027-10-12T09:00:00Z'), NAIROBI, false, new Date('2026-11-27T09:00:00Z'))).toBe('12 October 2027');
    expect(aDayInItsZone(new Date('2026-12-31T09:00:00Z'), NAIROBI, false, new Date('2026-11-27T09:00:00Z'))).toBe('31 December');
    expect(theYearIfNotThisOne(2026, new Date('2026-06-01T00:00:00Z'))).toBe('');
  });
});

describe('a direction whose day has passed asks what is next', () => {
  it('reads the day an aim is for', () => {
    expect(theDayAnAimIsBy('Sell 120 water dispensers by 30 October, every sale proved.', new Date('2026-10-12'))?.toISOString().slice(0, 10)).toBe('2026-10-30');
    expect(theDayAnAimIsBy('Close 10 deals by January 31', new Date('2026-12-02'))?.toISOString().slice(0, 10)).toBe('2027-01-31');
    expect(theDayAnAimIsBy('Grow the Nairobi accounts', new Date('2026-12-02'))).toBeNull();
  });

  it('asks the admin on Today once the day has passed, and not before', () => {
    const d = { now: { achieve: 'Sell 120 water dispensers by 30 October, every sale proved.' }, setAt: new Date('2026-10-12T09:00:00Z') };
    expect(aDirectionPastItsDay(d, 'org', new Date('2026-10-20T09:00:00Z'))).toBeNull();
    expect(aDirectionPastItsDay(d, 'org', new Date('2026-11-20T09:00:00Z'))).toMatchObject({ title: 'The company’s aim was for 30 October, and that day has passed.', action: { to: '/direction' } });
  });
});

describe('Today says each question once', () => {
  it('the same question from three check-ins is one item that names them', () => {
    const q = (g: string) => ({ key: `stall-${g}`, kind: 'decide' as const, title: 'Do you want to drop a deal after 3 working days with no answer?', detail: 'No deal is marked cold or dropped for going quiet until you set this.', action: { label: 'Yes, 3 working days', to: `/grounds/${g}` }, groundId: g, organizationId: 'o', checkInLabel: g });
    const once = eachQuestionOnce([q('Sales team, Q4'), q('Peter’s plan'), q('Faith’s first 90 days')]);
    expect(once).toHaveLength(1);
    expect(once[0].detail).toBe('No deal is marked cold or dropped for going quiet until you set this. It is for Sales team, Q4, Peter’s plan and Faith’s first 90 days.');
  });
});
