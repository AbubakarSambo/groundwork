import { theDaysItRunsOn, workingDaysOf } from './which-days-this-team-works';

/**
 * A DAILY CHECK-IN IS MONDAY TO FRIDAY UNLESS THE LEAD SAYS OTHERWISE (Hafsah, 15 October 2026), for every way a
 * check-in is made (the setup, an admin making one for a lead, the API), as GroundsService.create stores it.
 */
const stored = (cadence: string, said?: number[]) => workingDaysOf(theDaysItRunsOn(cadence, said));

describe('the days a new check-in runs on', () => {
  it('a daily one nobody gave days for runs Monday to Friday', () => {
    expect(stored('DAILY')).toEqual([1, 2, 3, 4, 5]);
  });
  it('a daily one she said any day for runs any day', () => {
    expect(stored('DAILY', [0, 1, 2, 3, 4, 5, 6])).toEqual([]);
  });
  it('days she gave are kept', () => {
    expect(stored('DAILY', [1, 2, 3, 4, 5, 6])).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it('any other rhythm is as before: nobody said is any day', () => {
    expect(stored('WEEKLY')).toEqual([]);
    expect(stored('FORTNIGHTLY')).toEqual([]);
  });
});
