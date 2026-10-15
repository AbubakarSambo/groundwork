import { periodOf } from './period-of';

/**
 * A PERIOD IS AT LEAST A WEEK (decision 57, item 1, 30 September 2026).
 *
 * A weekly-or-slower ground's period is its session number, unchanged - that has always been
 * right, and stays right. A daily ground's period is the calendar week its session fell in, so
 * three sessions in one week are one period, not three.
 */
describe('periodOf', () => {
  it('is the session number on a weekly ground', () => {
    expect(periodOf({ sessionNumber: 4, when: '2026-09-30T09:00:00Z' }, { cadence: 'WEEKLY' })).toBe(4);
  });

  it('is the session number on a fortnightly, monthly, sequential or one-time ground', () => {
    for (const cadence of ['FORTNIGHTLY', 'MONTHLY', 'SEQUENTIAL', 'ONE_TIME']) {
      expect(periodOf({ sessionNumber: 7, when: '2026-09-30T09:00:00Z' }, { cadence })).toBe(7);
    }
  });

  it('is the session number with no ground at all, so a caller with no cadence to hand never throws', () => {
    expect(periodOf({ sessionNumber: 2 }, null)).toBe(2);
    expect(periodOf({ sessionNumber: 2 }, undefined)).toBe(2);
  });

  it('collapses several sessions in the same calendar week to one period, on a daily ground', () => {
    const monday = periodOf({ sessionNumber: 1, when: '2026-09-28T08:00:00Z' }, { cadence: 'DAILY' });
    const wednesday = periodOf({ sessionNumber: 2, when: '2026-09-30T08:00:00Z' }, { cadence: 'DAILY' });
    const friday = periodOf({ sessionNumber: 3, when: '2026-10-02T08:00:00Z' }, { cadence: 'DAILY' });
    expect(monday).toBe(wednesday);
    expect(wednesday).toBe(friday);
  });

  it('gives the next week a bigger, different period number, on a daily ground', () => {
    const thisWeek = periodOf({ sessionNumber: 5, when: '2026-09-28T08:00:00Z' }, { cadence: 'DAILY' });
    const nextWeek = periodOf({ sessionNumber: 6, when: '2026-10-05T08:00:00Z' }, { cadence: 'DAILY' });
    expect(nextWeek).toBeGreaterThan(thisWeek);
  });

  it('never collides across a year boundary, on a daily ground', () => {
    const lateDecember = periodOf({ sessionNumber: 1, when: '2026-12-28T08:00:00Z' }, { cadence: 'DAILY' });
    const earlyJanuary = periodOf({ sessionNumber: 40, when: '2027-01-04T08:00:00Z' }, { cadence: 'DAILY' });
    expect(earlyJanuary).toBeGreaterThan(lateDecember);
  });

  it('falls back to the session number on a daily ground with no date to hand', () => {
    expect(periodOf({ sessionNumber: 9 }, { cadence: 'DAILY' })).toBe(9);
  });
});
