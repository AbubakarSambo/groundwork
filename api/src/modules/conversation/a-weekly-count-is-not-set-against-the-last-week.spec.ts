import { whatDoesNotAddUp, sayWhatDoesNotAddUp } from './what-does-not-add-up';
import { theUnitOfARound } from '../grounds/the-check-ins-own-schedule';

/** Run 9: Sam said 11 lanterns one week and 22 for the month, and was asked "Which of those numbers stands?". */
const said = [
  { text: 'We sold 11 lanterns this week.', type: 'PROGRESS', session: 1 },
  { text: 'We sold 22 lanterns so far this month.', type: 'PROGRESS', session: 2 },
];
const base = { said, thisSession: 2, targets: [], sessionsLeft: null, aiTurnsThisSession: [] };

describe('a figure said in a round covers that round, so two rounds are two counts', () => {
  it('reads one period for a round from the schedule', () => {
    expect(theUnitOfARound({ cadence: 'WEEKLY' })).toBe('week');
    expect(theUnitOfARound({ cadence: 'MONTHLY' })).toBe('month');
    expect(theUnitOfARound({ cadence: 'SEQUENTIAL' })).toBeNull();
  });
  it('still notices a change on a check-in that has no period', () => {
    expect(whatDoesNotAddUp(base).some((d) => d.kind === 'counted differently')).toBe(true);
  });
  it('sets nothing side by side on a weekly check-in and never asks which stands', () => {
    const input = { ...base, roundUnit: theUnitOfARound({ cadence: 'WEEKLY' }) };
    expect(whatDoesNotAddUp(input)).toEqual([]);
    expect(sayWhatDoesNotAddUp(input)).not.toMatch(/stands|counted differently|then 22/i);
  });
});
