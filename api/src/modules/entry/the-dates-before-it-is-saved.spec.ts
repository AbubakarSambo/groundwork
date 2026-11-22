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

/*
 * THE CASES THE SETUP SCREEN USED TO WORK OUT FOR ITSELF (client the-setup-as-the-lead-reads-it.spec.tsx and
 * the-session-count-is-one-rule.spec.ts, until 23 November 2026), moved here, to the one owner the screen now reads.
 * "Any day" (all seven days) keeps each case as it was written; the save's own default is Monday to Friday.
 */
describe('the "Now" rules, as the screen shows them', () => {
  const ANY = [0, 1, 2, 3, 4, 5, 6];
  const at = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 9));
  const days = (cadence: string, cadenceAnchorDay: number | null, startsOn: string, endsOn: string, now: Date) =>
    theDatesBeforeItIsSaved({ cadence, cadenceAnchorDay, startsOn, endsOn, workingDays: ANY }, now);
  it('Now, on a Sunday, every Monday: the first stays open until Monday 19', () => {
    expect(days('WEEKLY', 1, '', '', at(2026, 10, 11)).days).toEqual(['2026-10-11', '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09']);
  });
  it('Now, on the Monday itself', () => {
    expect(days('WEEKLY', 1, '', '', at(2026, 10, 12)).days).toEqual(['2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09']);
  });
  it('Now, on Thursday 15: Monday 19 is at least half a week away, so it is the next', () => {
    expect(days('WEEKLY', 1, '', '', at(2026, 10, 15)).days).toEqual(['2026-10-15', '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09']);
  });
  it('Now, on Saturday 17: Monday 19 is less than half a week away, so the next is Monday 26', () => {
    expect(days('WEEKLY', 1, '', '', at(2026, 10, 17)).days).toEqual(['2026-10-17', '2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16']);
  });
  it('Now, every other Monday, on a Sunday', () => {
    expect(days('FORTNIGHTLY', 1, '', '', at(2026, 10, 11)).days).toEqual(['2026-10-11', '2026-10-19', '2026-11-02', '2026-11-16', '2026-11-30']);
  });
  it('weekly on Mondays from Sunday 11 October until 29 November is seven', () => {
    expect(days('WEEKLY', 1, '', '2026-11-29', at(2026, 10, 11)).count).toBe(7);
  });
  it('monthly on the 20th until 15 January is three', () => {
    expect(days('MONTHLY', 20, '', '2027-01-15', at(2026, 10, 11))).toEqual({ days: ['2026-10-11', '2026-11-20', '2026-12-20'], count: 3 });
  });
  it('"Now" counts the same days as starting on today\'s date', () => {
    expect(days('DAILY', null, '', '2026-07-10', at(2026, 6, 30)).count).toBe(days('DAILY', null, '2026-06-30', '2026-07-10', at(2026, 6, 30)).count);
    expect(days('DAILY', null, '', '2026-07-10', at(2026, 6, 30)).count).toBe(11);
  });
  it('Tomorrow, a Monday', () => {
    expect(days('WEEKLY', 1, '2026-10-12', '', at(2026, 10, 11)).days).toEqual(['2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09']);
  });
  it('On a date, Wednesday 21', () => {
    expect(days('WEEKLY', 1, '2026-10-21', '', at(2026, 10, 11)).days).toEqual(['2026-10-21', '2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16']);
  });
  it('Now, monthly on the 20th, on the 25th: 20 November is at least half a month away', () => {
    expect(days('MONTHLY', 20, '', '', at(2026, 10, 25)).days).toEqual(['2026-10-25', '2026-11-20', '2026-12-20', '2027-01-20', '2027-02-20']);
  });
  it('On a date, monthly on the 20th, starting Monday 12: the 20th of the same month', () => {
    expect(days('MONTHLY', 20, '2026-10-12', '', at(2026, 10, 11)).days).toEqual(['2026-10-12', '2026-10-20', '2026-11-20', '2026-12-20', '2027-01-20']);
  });
  it('weekly from Sunday 27 September until 6 November is six', () => {
    expect(days('WEEKLY', null, '2026-09-27', '2026-11-06', at(2026, 9, 27)).count).toBe(6);
  });
});
