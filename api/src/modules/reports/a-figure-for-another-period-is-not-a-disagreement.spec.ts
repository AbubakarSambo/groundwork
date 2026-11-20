import { aFigureForAnotherPeriodIsNotADisagreement } from './a-figure-for-another-period-is-not-a-disagreement';

describe('what the report writer is told a round covers', () => {
  it('says a weekly round covers its own week, and that a month\'s figure is a difference of period, not a card', () => {
    const said = aFigureForAnotherPeriodIsNotADisagreement('WEEKLY', null)!;
    expect(said).toContain('each round of this check-in covers its own week');
    expect(said).toContain('not two people disagreeing');
    expect(said).toContain('Do not write it as a divergence');
  });
  it('is said in the unit the check-in runs in, and nothing for a check-in with no fixed round', () => {
    expect(aFigureForAnotherPeriodIsNotADisagreement('MONTHLY', null)).toContain('its own month');
    expect(aFigureForAnotherPeriodIsNotADisagreement('ONE_TIME', null)).toBeNull();
  });
});
