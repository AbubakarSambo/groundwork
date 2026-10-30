import { timeRulesFrom, changeTimeRules, isTheWeekLocked, aboveTheDaysLimit, theTimeRulesSaid } from './the-time-sheet-rules';

/* Release 9, from a policy approved on the policy board (Hafsah's decision, 25 October): 9 hours a day at most, a week locks on Monday. */
const known = { people: new Set<string>(), teams: new Set<string>(), clients: ['Kito Foods'] };
const rules = (changeTimeRules({}, { mostHoursADay: 9, weekLocksOn: 'Monday' }, known) as any).rules;

describe('a week locks, and a day has a limit', () => {
  it('keeps both, and says them in full sentences', () => {
    expect(rules).toEqual({ mostHoursADay: 9, weekLocksOn: 'monday' });
    const said = theTimeRulesSaid(rules, null, () => null);
    expect(said).toContain('No more than 9 hours a day on any project without approval.');
    expect(said).toContain('A week locks on Monday. Whoever approves time sheets can reopen it.');
  });

  it('locks the week of 19 October on Monday 26 October, and a reopened week takes hours again', () => {
    expect(isTheWeekLocked(rules, '2026-10-19', '2026-10-25')).toBe(false);
    expect(isTheWeekLocked(rules, '2026-10-19', '2026-10-26')).toBe(true);
    expect(isTheWeekLocked({ ...rules, reopened: ['2026-10-19'] }, '2026-10-19', '2026-10-27')).toBe(false);
    expect(isTheWeekLocked({}, '2026-10-19', '2027-01-01')).toBe(false);
  });

  it('says which hours are above the limit and need approval', () => {
    expect(aboveTheDaysLimit(rules, [{ client: 'Kito Foods', onDay: '2026-10-20', hours: 10 }, { client: 'Kito Foods', onDay: '2026-10-21', hours: 8 }]))
      .toEqual(['10 hours on Kito Foods on 20 October is more than 9 hours, so it needs approval.']);
  });

  it('refuses a limit or a day that cannot be', () => {
    expect(changeTimeRules({}, { mostHoursADay: 30 }, known)).toEqual({ refused: 'Give the most hours a day as a number from 1 to 24.' });
    expect(changeTimeRules({}, { weekLocksOn: 'Someday' }, known)).toEqual({ refused: 'Give the day a week locks as a weekday, such as Monday.' });
    expect(timeRulesFrom({ mostHoursADay: 9, weekLocksOn: 'friday' })).toEqual({ mostHoursADay: 9, weekLocksOn: 'friday' });
  });
});
