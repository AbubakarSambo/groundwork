import { workingDaysOf, isAWorkingDay, theNextDayTheyWork, sayWhichDays, MONDAY_TO_FRIDAY } from './which-days-this-team-works';

// 13 Sep 2026 is a Sunday; the 14th a Monday; the 19th a Saturday.
const sunday = () => new Date(2026, 8, 13);
const saturday = () => new Date(2026, 8, 19);
const wednesday = () => new Date(2026, 8, 16);

describe('a check-in does not open on a day nobody works', () => {
  it('leaves every date alone when nobody said', () => {
    expect(theNextDayTheyWork(sunday(), []).getDay()).toBe(0);
    expect(theNextDayTheyWork(sunday(), null).getDay()).toBe(0);
  });

  it('treats all seven days listed as nobody said', () => {
    expect(workingDaysOf([0, 1, 2, 3, 4, 5, 6])).toEqual([]);
    expect(theNextDayTheyWork(sunday(), [0, 1, 2, 3, 4, 5, 6]).getDay()).toBe(0);
  });

  it('rolls a Sunday forward to Monday on weekdays only', () => {
    const d = theNextDayTheyWork(sunday(), MONDAY_TO_FRIDAY);
    expect(d.getDay()).toBe(1);
    expect(d.getDate()).toBe(14);
  });

  it('rolls a Saturday forward two days, never back one', () => {
    const d = theNextDayTheyWork(saturday(), MONDAY_TO_FRIDAY);
    expect(d.getDate()).toBe(21);
  });

  it('leaves a day they do work exactly where it is', () => {
    expect(theNextDayTheyWork(wednesday(), MONDAY_TO_FRIDAY).getDate()).toBe(16);
  });

  it('handles a week that is not Monday to Friday', () => {
    // Sunday to Thursday.
    const d = theNextDayTheyWork(saturday(), [0, 1, 2, 3, 4]);
    expect(d.getDay()).toBe(0);
  });

  it('never becomes unschedulable on junk from an old client', () => {
    expect(workingDaysOf([1, 2, 99, -3, 2])).toEqual([1, 2]);
    expect(theNextDayTheyWork(sunday(), [1, 2, 99])).toBeInstanceOf(Date);
  });

  it('says nothing when nobody said', () => {
    expect(sayWhichDays([])).toBeNull();
  });

  it('names weekdays as weekdays and anything else by its days', () => {
    expect(sayWhichDays(MONDAY_TO_FRIDAY)).toContain('Weekdays only');
    expect(sayWhichDays([0, 1, 2, 3, 4])).toBe('Check-ins only open on Sunday, Monday, Tuesday, Wednesday or Thursday.');
    expect(sayWhichDays([2])).toBe('Check-ins only open on a Tuesday.');
  });

  it('answers whether a given day is one they work', () => {
    expect(isAWorkingDay(sunday(), MONDAY_TO_FRIDAY)).toBe(false);
    expect(isAWorkingDay(wednesday(), MONDAY_TO_FRIDAY)).toBe(true);
    expect(isAWorkingDay(sunday(), [])).toBe(true);
  });
});
