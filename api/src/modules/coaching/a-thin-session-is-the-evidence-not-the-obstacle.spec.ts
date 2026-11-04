import { nextMove } from './one-step-at-a-time';

/**
 * A STEP RESTS ON SOMETHING OF THE WORK, AND EVERY OTHER REASON TO WAIT HOLDS.
 *
 * This file used to pin the universal floor's steps about the account ("Put one detail on each thing you name"), offered on a
 * thin session. That floor was the coach's own transcript read, removed on 2 November 2026 (F2, Hafsah's decisions): every step
 * is now layer 3's, for a pattern resting on distinct items across the record, so no step is about the account. The machine's
 * other reasons to wait are unchanged and still asserted here.
 */
const state = { currentStep: null, stepGivenAt: null, staircase: null, staircasePosition: 0, history: [] };

describe('a step rests on something of the work', () => {
  const step = {
    noticed: 'Which of the things you said you would do since last time is still open, and what day will you finish it?',
    lookingLike: 'Which of the things you said you would do since last time is still open, and what day will you finish it?',
    reason: 'Promises were not kept when they came due.',
    sessionNumber: 3,
    hadSubstance: true,
  };

  it('offers the step when it rests on something', () => {
    const move = nextMove(state, step);
    expect(move.move).toBe('offer');
    expect((move as any).step).toBe(step.lookingLike);
  });

  it('and waits when nothing is under it', () => {
    const move = nextMove(state, { ...step, hadSubstance: false });
    expect(move.move).toBe('wait');
    expect((move as any).because).toMatch(/nothing checkable in it/);
  });

  it('every other reason to wait is untouched', () => {
    /* No reason is still an accusation with no answer to it. */
    expect(nextMove(state, { ...step, reason: '  ' }).move).toBe('wait');
    /* No destination is still nothing to walk toward. */
    expect(nextMove(state, { ...step, lookingLike: null }).move).toBe('wait');
    /* A step already outstanding is still asked about before a second one is offered. */
    expect(nextMove({ ...state, currentStep: 'something else', stepGivenAt: 2 }, step).move).toBe('ask about the last one');
  });
});
