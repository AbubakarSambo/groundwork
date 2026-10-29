import { theDaysItRunsOn, workingDaysOf, isAWorkingDay, theNextDayTheyWork } from './which-days-this-team-works';

/**
 * ONE CALENDAR FOR EACH CHECK-IN (Hafsah, 29 October 2026). Fee notes, a weekly check-in saved with no days, was "due tomorrow, Sunday
 * 31 January", and leads were sent their summary on Saturdays and Sundays: each reader made up its own meaning for "no days".
 */
describe('one calendar, set at setup, never empty', () => {
  it('every rhythm is Monday to Friday unless the lead says otherwise', () => {
    for (const cadence of ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', null]) expect(theDaysItRunsOn(cadence, undefined)).toEqual([1, 2, 3, 4, 5]);
    expect(theDaysItRunsOn('WEEKLY', [1, 3, 6])).toEqual([1, 3, 6]);
    expect(workingDaysOf([0, 1, 2, 3, 4, 5, 6])).toHaveLength(7);
  });

  it('a check-in stored with no days, from before, reads as Monday to Friday everywhere', () => {
    expect(workingDaysOf([])).toEqual([1, 2, 3, 4, 5]);
    expect(isAWorkingDay(new Date('2027-01-31T09:00:00Z'), [], 'Africa/Nairobi')).toBe(false);
    expect(theNextDayTheyWork(new Date('2027-01-31T09:00:00Z'), []).getDay()).toBe(1);
  });

  it('the day is read where the check-in is: Friday 23:30 in Lagos is already Saturday in Nairobi', () => {
    const at = new Date('2027-01-29T21:30:00Z');
    expect(isAWorkingDay(at, [1, 2, 3, 4, 5], 'Africa/Lagos')).toBe(true);
    expect(isAWorkingDay(at, [1, 2, 3, 4, 5], 'Africa/Nairobi')).toBe(false);
  });
});
