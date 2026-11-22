import { theDatesBeforeItIsSaved } from './the-dates-before-it-is-saved';
import { howManyRoundsUpTo } from '../grounds/the-check-ins-own-schedule';

/* Sunday 22 November 2026, midday in Lagos: the day Hafsah set up a weekly check-in and was told it opened on Sunday. */
const SUNDAY = new Date('2026-11-22T11:00:00Z');

describe('the dates a setup will open on come from the check-in’s own schedule', () => {
  it('never opens on a silent Sunday: with no start and no days given, the first day is Monday', () => {
    const r = theDatesBeforeItIsSaved({ cadence: 'WEEKLY', startsOn: '', endsOn: '' }, SUNDAY);
    expect(r.days[0]).toBe('2026-11-23');
    expect(new Date(`${r.days[0]}T00:00:00Z`).getUTCDay()).toBe(1);
    expect(r.count).toBeNull();
  });

  it('follows the day they said: every Monday', () => {
    const r = theDatesBeforeItIsSaved({ cadence: 'WEEKLY', cadenceAnchorDay: 1, startsOn: '2026-11-23', endsOn: '2026-12-21' }, SUNDAY);
    expect(r.days).toEqual(['2026-11-23', '2026-11-30', '2026-12-07', '2026-12-14', '2026-12-21']);
    expect(r.count).toBe(5);
  });

  it('counts exactly what the saved check-in counts, so the two can never say 29 and 25', () => {
    const start = Date.UTC(2026, 10, 23);
    const end = Date.UTC(2026, 11, 31);
    const r = theDatesBeforeItIsSaved({ cadence: 'DAILY', startsOn: '2026-11-23', endsOn: '2026-12-31' }, SUNDAY);
    expect(r.count).toBe(howManyRoundsUpTo({ cadence: 'DAILY' as any, anchorDay: null, days: null, workingDays: [1, 2, 3, 4, 5], startsNow: false }, start, end));
    expect(r.days.every((d) => ![0, 6].includes(new Date(`${d}T00:00:00Z`).getUTCDay()))).toBe(true);
  });

  it('a one-time check-in is one day, and one that opens when the lead checks in has no dates', () => {
    expect(theDatesBeforeItIsSaved({ cadence: 'ONE_TIME', startsOn: '2026-11-25' }, SUNDAY)).toEqual({ days: ['2026-11-25'], count: 1 });
    expect(theDatesBeforeItIsSaved({ cadence: 'SEQUENTIAL' }, SUNDAY)).toEqual({ days: [], count: null });
  });
});
