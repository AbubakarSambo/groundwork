import { isAgainstAGoalTheyStated, whatTheySaidThisWasFor } from './against-the-goal-they-stated';

/** Adversarial run 2, 20 Sep 2026: Grace's tractor-hire income read as delivering against her maize goal. */
describe('against the goal they stated', () => {
  const goals = ['Increase my own maize output with the tractor, from 40 to 60 bags', 'Pay the loan on time'];

  it('an output about the goal counts', () => {
    expect(isAgainstAGoalTheyStated('Harvested 55 bags of maize this season, up from 40.', goals)).toBe(true);
    expect(isAgainstAGoalTheyStated('Paid the loan instalment early again this month.', goals)).toBe(true);
  });

  it('an output about something else does not', () => {
    expect(isAgainstAGoalTheyStated('The tractor is booked solid five days a week and brought in N420,000 in hire income.', ['Increase my own maize output, from 40 to 60 bags'])).toBe(false);
  });

  it('with no stated goal there is nothing to fail against', () => {
    expect(isAgainstAGoalTheyStated('Anything at all', [])).toBe(true);
  });

  it('and the detector is told what the goals were', () => {
    expect(whatTheySaidThisWasFor(goals)).toContain('"Against stated goals" means against THESE');
    expect(whatTheySaidThisWasFor([])).toBe('');
  });
});
