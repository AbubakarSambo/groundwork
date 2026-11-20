import { theStepsFor, everyStepFor } from './who-may-decide';
import { theCardsAnswers, withTheCardsAnswers } from './the-spending-rules';

/**
 * TWO ANSWERS ON ONE PAGE MUST NOT SILENTLY DISAGREE (B-004), NOW BY HAVING ONE PLACE (Hafsah's plan of 2 November, step 0).
 * Msingi Foods: spending limit 100,000 shillings, "who approves above" Fatuma. B-004 once spliced Fatuma into separately stored steps
 * above the limit. Now the settings card's two answers are the lowest of the steps by amount, so there is nothing to splice: the card,
 * the board's steps and the routing read the same rows.
 */
const rules = withTheCardsAnswers({}, { limit: 100000, above: 'u-fatuma' });

describe('spending above the limit', () => {
  it('goes to the person named on the settings card, because the card is the lowest of the steps by amount', () => {
    expect(rules.thresholds).toEqual([{ above: 100000, steps: [[{ named: 'u-fatuma' }]] }]);
    expect(theStepsFor('spend', rules, 150000)).toEqual([[{ named: 'u-fatuma' }]]);
  });
  /* Batch S, S2 (Hafsah, 19 November 2026): up to the limit the manager approves, then their manager's manager, then an admin. */
  it('is the manager, or else their manager, or else an admin, up to the limit', () => {
    expect(theStepsFor('spend', rules, 90000)).toEqual([['manager', 'managersManager', 'admin']]);
  });
  it('steps set on the board for that amount are what the card reads back, so the two can never disagree', () => {
    const board = { thresholds: [{ above: 100000, steps: [['manager'], ['finance'], ['admin']] as any }] };
    expect(theStepsFor('spend', board, 150000)).toEqual([['manager'], ['finance'], ['admin']]);
    expect(theCardsAnswers(board)).toEqual({ limit: 100000, above: null });
    /* Saving the card again with nothing changed leaves the board's steps alone. */
    expect(withTheCardsAnswers(board, { limit: 100000, above: null })).toBe(board);
  });
  it('lets the named person see it on the board', () => {
    expect(JSON.stringify(everyStepFor('spend', rules))).toContain('u-fatuma');
  });
});
