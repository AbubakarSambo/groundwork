import { howForecastsHaveGone, Estimate, ENOUGH_TO_SAY_ANYTHING, WHAT_THIS_DOES_NOT_EXPLAIN, NEVER_CONCLUDE_FROM_FORECASTS } from './what-a-forecast-turned-out-to-be';

const e = (saidDay: number, landedDay: number | null, what = 'the scenario'): Estimate => ({
  what,
  said: new Date(2026, 4, saidDay),
  landed: landedDay === null ? null : new Date(2026, 4, landedDay),
});

describe('one estimate is not a pattern', () => {
  it('says nothing at all below four finished dates', () => {
    expect(howForecastsHaveGone([e(1, 5), e(2, 9), e(3, 20)]).says).toEqual([]);
  });

  it('and counts only the ones that actually finished', () => {
    /* Four given and one landed is one data point, not four. */
    const out = howForecastsHaveGone([e(1, 5), e(2, null), e(3, null), e(4, null)]);
    expect(out.says).toEqual([]);
    expect(out.from).toBe(1);
  });

  it('the bar is the same three-period spirit as every other pattern', () => {
    expect(ENOUGH_TO_SAY_ANYTHING).toBeGreaterThanOrEqual(3);
  });
});

describe('what it says once there are enough', () => {
  const four = [e(1, 5), e(2, 2), e(10, 20), e(12, 12)];

  it('counts late, on the day, and early separately', () => {
    const said = howForecastsHaveGone(four).says.join(' ');
    expect(said).toContain('Of 4 dates given');
    expect(said).toContain('2 late');
    expect(said).toContain('2 on the day');
  });

  it('gives the range of the misses rather than an average', () => {
    /* A mean turns four situations into one number, and the number is what ends up in a review. */
    const said = howForecastsHaveGone(four).says.join(' ');
    expect(said).toContain('ran over by 4 to 10 days');
    expect(said).not.toMatch(/average|mean|typical/i);
  });

  it('says when it is getting better, which is the part worth reading', () => {
    const improving = [e(1, 9), e(2, 12), e(3, 14), e(20, 20), e(21, 21), e(22, 22)];
    expect(howForecastsHaveGone(improving).says.join(' ')).toContain('moving in the right direction');
  });

  it('and says when it is getting worse, as a question rather than a finding', () => {
    const worsening = [e(1, 1), e(2, 2), e(3, 3), e(20, 30), e(21, 32), e(22, 30)];
    const said = howForecastsHaveGone(worsening).says.join(' ');
    expect(said).toContain('Worth asking what changed');
    expect(said).not.toMatch(/declining|slipping|deteriorat/i);
  });
});

describe('and it never explains', () => {
  it('names the four explanations it cannot choose between', () => {
    const said = howForecastsHaveGone([e(1, 5), e(2, 9), e(3, 14), e(4, 20)]).says.join(' ');
    expect(said).toContain(WHAT_THIS_DOES_NOT_EXPLAIN);
    expect(WHAT_THIS_DOES_NOT_EXPLAIN).toContain('scope arriving after the date was given');
    expect(WHAT_THIS_DOES_NOT_EXPLAIN).toContain('never a fortnight');
  });

  it('carries no score, rating or percentage anywhere', () => {
    const said = howForecastsHaveGone([e(1, 5), e(2, 9), e(3, 14), e(4, 20)]).says.join(' ');
    expect(said).not.toMatch(/%|percent|score|rating|accuracy/i);
  });

  it('forbids the synthesis turning dates into a description of a person', () => {
    for (const p of ['accuracy figure', 'optimistic, unreliable', 'belongs to the person who gave the date']) {
      expect(NEVER_CONCLUDE_FROM_FORECASTS).toContain(p);
    }
  });

  it('and says why comparing two people on this is meaningless', () => {
    expect(NEVER_CONCLUDE_FROM_FORECASTS).toContain('estimating hard work badly is not worse');
  });
});
