import { nextMove } from './one-step-at-a-time';

/**
 * THIRTEEN PEOPLE, COUNTED ON THE CORPUS, WHOSE STEP WAS HELD BACK BY THE THING IT WOULD HAVE FIXED.
 *
 * Hafsah: "coaching can happen without a pattern but pattern based coaching is what fires after 3
 * sessions." She is right, and checking it turned this up. Of 226 people with two or more
 * observations and no step, 185 are correct (the behaviour did not recur) and one was correctly
 * suppressed. Thirteen had every condition met - the same behaviour in two distinct sessions, not
 * something they asked for themselves, a paired destination to walk toward - and no step, because
 * `hadSubstance` was false.
 *
 * The steps being withheld:
 *
 *   "Put one detail on each thing you name, so somebody else can tell whether it happened."
 *   "When something stalls, say what you tried next."
 *
 * A vague session is exactly what those steps are for. The gate is right about the work and wrong
 * about the account, so it now asks which kind of step it is holding.
 */
const state = { currentStep: null, stepGivenAt: null, staircase: null, staircasePosition: 0, history: [] };

describe('a thin session is the evidence, not the obstacle', () => {
  const thin = {
    noticed: 'Nothing you named has a date, a number or a name on it, so nobody can check any of it later.',
    lookingLike: 'Put one detail on each thing you name, so somebody else can tell whether it happened.',
    reason: 'Nothing they named this session carried a date, a number or a name.',
    sessionNumber: 3,
    hadSubstance: false,
  };

  it('offers a step about the account on a session with nothing checkable in it', () => {
    const move = nextMove(state, { ...thin, aboutTheAccount: true });
    expect(move.move).toBe('offer');
    expect((move as any).step).toBe(thin.lookingLike);
  });

  it('and still waits where the step is about the work', () => {
    const move = nextMove(state, { ...thin, aboutTheAccount: false });
    expect(move.move).toBe('wait');
    expect((move as any).because).toMatch(/nothing checkable in it/);
  });

  it('and treats a missing flag the way it always behaved', () => {
    expect(nextMove(state, thin).move).toBe('wait');
  });

  it('every other reason to wait is untouched', () => {
    /* No reason is still an accusation with no answer to it. */
    expect(nextMove(state, { ...thin, reason: '  ', aboutTheAccount: true }).move).toBe('wait');
    /* No destination is still nothing to walk toward. */
    expect(nextMove(state, { ...thin, lookingLike: null, aboutTheAccount: true }).move).toBe('wait');
    /* A step already outstanding is still asked about before a second one is offered. */
    expect(nextMove(
      { ...state, currentStep: 'something else', stepGivenAt: 2 },
      { ...thin, aboutTheAccount: true },
    ).move).toBe('ask about the last one');
  });

  it('and the service says which kind of step it is holding', () => {
    const src = require('fs')
      .readFileSync(require('path').join(__dirname, '..', 'conversation', 'conversation.service.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    /* True for exactly the universal floor, which is what somebody gets when nobody has settled
       what kind of work they do - and that floor is entirely about the account. */
    expect(src).toMatch(/aboutTheAccount: readFromTheAccount/);
  });
});
