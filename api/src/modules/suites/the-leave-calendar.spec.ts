import {
  THE_USUAL_CALENDAR, calendarFrom, daysLeftOf, leaveDaysUsed, readLeaveCalendars, theLastDayAfter, theLeaveYear,
} from './the-leave-calendar';
import { workingDays } from './the-leave-board.service';

/**
 * THE LEAVE CALENDAR, THE ONE COUNT OF LEAVE DAYS (Hafsah, 20 November 2026): weekends, a public holiday inside the leave, an office in
 * another country, annual leave built up month by month, and carried-over days that expire. With nothing set, it counts exactly as
 * leave was counted before: Monday to Friday.
 */
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

describe('the days a request uses', () => {
  it('with nothing set, counts Monday to Friday, as before', () => {
    /* Friday 2 October to Monday 5 October 2026. */
    expect(leaveDaysUsed(THE_USUAL_CALENDAR, '2026-10-02', '2026-10-05')).toBe(2);
    expect(workingDays(d('2026-10-02'), d('2026-10-05'))).toBe(2);
    expect(leaveDaysUsed(THE_USUAL_CALENDAR, '2026-10-03', '2026-10-04')).toBe(0);
  });

  it('counts the weekend when the organisation says weekends count', () => {
    expect(leaveDaysUsed(calendarFrom({ weekendsCount: true }), '2026-10-02', '2026-10-05')).toBe(4);
  });

  it('reads the working week the organisation set: Monday to Saturday', () => {
    expect(leaveDaysUsed(calendarFrom({ workingWeek: [1, 2, 3, 4, 5, 6] }), '2026-10-02', '2026-10-05')).toBe(3);
  });

  it('leaves out a confirmed public holiday inside the leave, unless holidays count', () => {
    /* Madaraka Day, Tuesday 1 June 2027, inside Monday 31 May to Friday 4 June. */
    expect(leaveDaysUsed(calendarFrom({}, ['2027-06-01']), '2027-05-31', '2027-06-04')).toBe(4);
    expect(leaveDaysUsed(calendarFrom({ holidaysCount: true }, ['2027-06-01']), '2027-05-31', '2027-06-04')).toBe(5);
  });

  it('a type that counts every day counts weekends and holidays whatever the rule for all leave', () => {
    expect(leaveDaysUsed(calendarFrom({}, ['2027-06-01']), '2027-05-31', '2027-06-06', { everyDay: true })).toBe(7);
    /* Maternity leave of 90 days from Wednesday 3 March 2027 ends on Monday 31 May 2027. */
    expect(theLastDayAfter(THE_USUAL_CALENDAR, '2027-03-03', 90, { everyDay: true })).toBe('2027-05-31');
    /* Ten working days from Monday 1 March end on Friday 12 March. */
    expect(theLastDayAfter(THE_USUAL_CALENDAR, '2027-03-01', 10)).toBe('2027-03-12');
  });

  it('a person in an office in another country follows that office’s holidays; everybody else the organisation’s', async () => {
    const prisma: any = {
      leaveOffice: { findMany: jest.fn(async () => [{ id: 'o-lagos', name: 'Lagos', country: 'Nigeria' }]) },
      publicHoliday: {
        findMany: jest.fn(async ({ where }: any) => [
          { officeId: null, on: d('2026-10-20'), confirmed: true }, /* Mashujaa Day, Kenya */
          { officeId: 'o-lagos', on: d('2026-10-01'), confirmed: true }, /* Independence Day, Nigeria */
          { officeId: null, on: d('2026-10-22'), confirmed: false }, /* drafted, not confirmed: does not count */
        ].filter((h) => where.confirmed === undefined || h.confirmed === where.confirmed)),
      },
      organizationMembership: { findMany: jest.fn(async () => [{ userId: 'u-chidi', officeId: 'o-lagos' }]) },
    };
    const cals = await readLeaveCalendars(prisma, 'org', {});
    /* Monday 19 to Friday 23 October 2026. */
    expect(leaveDaysUsed(cals.of('u-aisha'), '2026-10-19', '2026-10-23')).toBe(4);
    expect(leaveDaysUsed(cals.of('u-chidi'), '2026-10-19', '2026-10-23')).toBe(5);
    /* Monday 28 September to Friday 2 October 2026. */
    expect(leaveDaysUsed(cals.of('u-aisha'), '2026-09-28', '2026-10-02')).toBe(5);
    expect(leaveDaysUsed(cals.of('u-chidi'), '2026-09-28', '2026-10-02')).toBe(4);
    expect(cals.officeOf('u-chidi')).toEqual({ id: 'o-lagos', name: 'Lagos', country: 'Nigeria' });
    expect(cals.officeOf('u-aisha')).toBeNull();
  });

  it('with no offices or holidays stored, everybody counts Monday to Friday', async () => {
    const cals = await readLeaveCalendars({} as any, 'org', null);
    expect(leaveDaysUsed(cals.of('u-aisha'), '2026-10-02', '2026-10-05')).toBe(2);
  });
});

describe('the days left', () => {
  const cal = THE_USUAL_CALENDAR;

  it('given all at the start of the year, as before: 21 less what was taken', () => {
    expect(daysLeftOf({ perYear: 21 }, cal, [{ startsOn: '2026-03-02', endsOn: '2026-03-06' }], '2026-07-15')).toBe(16);
    expect(daysLeftOf({ perYear: null }, cal, [], '2026-07-15')).toBeNull();
  });

  it('built up each month: half way through the year, half the days, to the half day', () => {
    /* Six whole months, January to June, have ended by 15 July: 21 × 6 / 12 = 10.5. */
    expect(daysLeftOf({ perYear: 21, accrual: 'monthly' }, cal, [], '2026-07-15')).toBe(10.5);
    /* The last day of June ends June. */
    expect(daysLeftOf({ perYear: 21, accrual: 'monthly' }, cal, [], '2026-06-30')).toBe(10.5);
    expect(daysLeftOf({ perYear: 21, accrual: 'monthly' }, cal, [], '2026-01-10')).toBe(0);
    expect(daysLeftOf({ perYear: 21, accrual: 'monthly' }, cal, [{ startsOn: '2026-03-02', endsOn: '2026-03-04' }], '2026-07-15')).toBe(7.5);
  });

  it('a leave year that starts in July', () => {
    expect(theLeaveYear('2027-03-10', 7)).toEqual({ from: '2026-07-01', to: '2027-06-30' });
    expect(theLeaveYear('2027-07-01', 7)).toEqual({ from: '2027-07-01', to: '2028-06-30' });
    /* Leave taken in May 2026 is in the year before the one that starts in July 2026. */
    expect(daysLeftOf({ perYear: 20, yearStarts: 7 }, cal, [{ startsOn: '2026-05-04', endsOn: '2026-05-08' }], '2026-08-03')).toBe(20);
  });

  it('carries over up to five days, which expire at the end of March unless used by then', () => {
    const rule = { perYear: 20, carryOver: 5, carryExpires: 3, carryFrom: '2026-01-01' };
    /* 12 days taken in 2026 leave 8, and 5 of them are carried into 2027. */
    const taken = [{ startsOn: '2026-05-04', endsOn: '2026-05-19' }];
    expect(daysLeftOf(rule, cal, taken, '2027-02-01')).toBe(25);
    /* Two days taken in February 2027 come from the carried days; after March the other three are lost. */
    const more = [...taken, { startsOn: '2027-02-08', endsOn: '2027-02-09' }];
    expect(daysLeftOf(rule, cal, more, '2027-03-15')).toBe(23);
    expect(daysLeftOf(rule, cal, more, '2027-04-01')).toBe(20);
    /* Nothing taken before the end of March: all five are lost. */
    expect(daysLeftOf(rule, cal, taken, '2027-04-01')).toBe(20);
  });

  it('carries over all that is left when the policy says all, and never from a year Groundwork did not record in full', () => {
    expect(daysLeftOf({ perYear: 20, carryOver: 'all', carryFrom: '2026-01-01' }, cal, [{ startsOn: '2026-05-04', endsOn: '2026-05-08' }], '2027-06-01')).toBe(35);
    /* Carry-over set during 2026 starts from the 2027 leave year: nothing is carried into 2027 from 2026. */
    expect(daysLeftOf({ perYear: 20, carryOver: 'all', carryFrom: '2027-01-01' }, cal, [], '2027-06-01')).toBe(20);
  });

  it('counts taken days by the person’s calendar: a public holiday inside the leave is not taken from the balance', () => {
    const withMadaraka = calendarFrom({}, ['2027-06-01']);
    expect(daysLeftOf({ perYear: 21 }, withMadaraka, [{ startsOn: '2027-05-31', endsOn: '2027-06-04' }], '2027-07-01')).toBe(17);
  });
});
