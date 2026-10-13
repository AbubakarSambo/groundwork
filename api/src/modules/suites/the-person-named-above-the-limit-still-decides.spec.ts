import { theStepsFor, theStepsADecisionFollows, everyStepFor } from './who-may-decide';

/**
 * TWO ANSWERS ON ONE PAGE MUST NOT SILENTLY DISAGREE (B-004). Msingi Foods: spending limit 100,000 shillings,
 * "who approves above" Fatuma, and approval steps above the limit of the manager, then finance, then an admin.
 * A request for 150,000 used to go to the steps alone and never reach Fatuma. She now decides the last step, in front of an admin.
 */
const workflow = { steps: [['manager', 'admin']], stepsAbove: [['manager'], ['finance'], ['admin']] } as any;
const answers = { limit: 100000, above: 'u-fatuma', workflow };

describe('spending above the limit', () => {
  it('still goes to the person named, after the steps the admin set', () => {
    expect(theStepsADecisionFollows(answers, 150000)).toEqual([['manager'], ['finance'], [{ named: 'u-fatuma' }, 'admin']]);
    /* What a page shows back is still exactly what was stored. */
    expect(theStepsFor('spend', answers, 150000)).toEqual([['manager'], ['finance'], ['admin']]);
  });
  it('is unchanged up to the limit', () => {
    expect(theStepsADecisionFollows(answers, 90000)).toEqual([['manager', 'admin']]);
  });
  it('is unchanged when nobody is named, or the steps already name them', () => {
    expect(theStepsADecisionFollows({ ...answers, above: null }, 150000)).toEqual([['manager'], ['finance'], ['admin']]);
    const named = { ...answers, workflow: { ...workflow, stepsAbove: [['manager'], [{ named: 'u-fatuma' }]] } };
    expect(theStepsADecisionFollows(named, 150000)).toEqual([['manager'], [{ named: 'u-fatuma' }]]);
  });
  it('lets the named person see it on the board', () => {
    expect(JSON.stringify(everyStepFor('spend', answers))).toContain('u-fatuma');
  });
});
