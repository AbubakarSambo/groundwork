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
    expect(stored('DAILY', [0, 1, 2, 3, 4, 5, 6])).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
  it('days she gave are kept', () => {
    expect(stored('DAILY', [1, 2, 3, 4, 5, 6])).toEqual([1, 2, 3, 4, 5, 6]);
  });
  /* Updated 29 October. ONE CALENDAR FOR EACH CHECK-IN (Hafsah, 29 October 2026): no days given is Monday to Friday, for every reader; all seven listed is every day. Fee notes, weekly with no days, was due on a Sunday. */
  it('every other rhythm is Monday to Friday too, unless she says otherwise', () => {
    expect(stored('WEEKLY')).toEqual([1, 2, 3, 4, 5]);
    expect(stored('FORTNIGHTLY')).toEqual([1, 2, 3, 4, 5]);
  });
});
