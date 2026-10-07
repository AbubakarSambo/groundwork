import { theStepsFor, everyStepFor } from './who-may-decide';

/**
 * TWO ANSWERS ON ONE PAGE MUST NOT SILENTLY DISAGREE (B-004). Msingi Foods: spending limit 100,000 shillings,
 * "who approves above" Fatuma, and approval steps above the limit of the manager, then finance, then an admin.
 * A request for 150,000 used to go to the steps alone and never reach Fatuma. She now decides the last step, in front of an admin.
 */
const workflow = { steps: [['manager', 'admin']], stepsAbove: [['manager'], ['finance'], ['admin']] } as any;
const answers = { limit: 100000, above: 'u-fatuma', workflow };

describe('spending above the limit', () => {
  it('still goes to the person named, after the steps the admin set', () => {
    expect(theStepsFor('spend', answers, 150000)).toEqual([['manager'], ['finance'], [{ named: 'u-fatuma' }, 'admin']]);
  });
  it('is unchanged up to the limit', () => {
    expect(theStepsFor('spend', answers, 90000)).toEqual([['manager', 'admin']]);
  });
  it('is unchanged when nobody is named, or the steps already name them', () => {
    expect(theStepsFor('spend', { ...answers, above: null }, 150000)).toEqual([['manager'], ['finance'], ['admin']]);
    const named = { ...answers, workflow: { ...workflow, stepsAbove: [['manager'], [{ named: 'u-fatuma' }]] } };
    expect(theStepsFor('spend', named, 150000)).toEqual([['manager'], [{ named: 'u-fatuma' }]]);
  });
  it('lets the named person see it on the board', () => {
    expect(JSON.stringify(everyStepFor('spend', answers))).toContain('u-fatuma');
  });
});
