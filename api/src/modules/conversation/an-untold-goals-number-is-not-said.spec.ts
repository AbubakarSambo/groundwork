import { saysWhatAnUntoldGoalWithholds } from './an-untold-goals-number-is-not-said';

/**
 * DECISION 56, ITEM 2, SECOND LAYER: the reply guard that catches a number or a "goal has been set"
 * sentence that should never have reached a person their lead has not told yet.
 */
const untold = [{ text: 'Hit 40 stock counts by Friday', target: '40' }];

describe('saysWhatAnUntoldGoalWithholds', () => {
  it('is false for an ordinary reply about the work, in figures', () => {
    expect(saysWhatAnUntoldGoalWithholds('How are the stock counts going this week?', untold)).toBe(false);
  });

  it('catches the goal\'s own number stated in figures', () => {
    expect(saysWhatAnUntoldGoalWithholds('Your lead is looking for 40 of them.', untold)).toBe(true);
  });

  it('catches the target field even when the wording differs from the goal text', () => {
    expect(saysWhatAnUntoldGoalWithholds('There is a number to hit here: 40.', untold)).toBe(true);
  });

  it('catches a sentence that says a goal or target has been set, with no number at all', () => {
    expect(saysWhatAnUntoldGoalWithholds('Your lead has set a goal for this.', untold)).toBe(true);
    expect(saysWhatAnUntoldGoalWithholds('You have a target set for the stock counts.', untold)).toBe(true);
  });

  it('does not fire on an unrelated number the person raises themselves', () => {
    expect(saysWhatAnUntoldGoalWithholds('I counted 12 pallets yesterday.', untold)).toBe(false);
  });

  it('is false with nothing untold on this check-in', () => {
    expect(saysWhatAnUntoldGoalWithholds('The target is 40.', [])).toBe(false);
  });

  it('a short number like a session count is not treated as the target by accident', () => {
    expect(saysWhatAnUntoldGoalWithholds('This is session 4 of 8.', untold)).toBe(false);
  });
});
