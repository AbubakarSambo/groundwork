import { seenInEnoughSessions, theyAskedForItThemselves, SESSIONS_BEFORE_A_STEP } from './one-step-at-a-time';

describe('a step waits for recurrence', () => {
  it('one session is not a pattern', () => {
    expect(seenInEnoughSessions([{ sessionNumber: 1, noticed: 'Chases people for updates', reason: 'x' }], 'Chases people for updates')).toBe(false);
  });
  it('the same thing in two distinct sessions is', () => {
    expect(SESSIONS_BEFORE_A_STEP).toBe(2);
    expect(seenInEnoughSessions([
      { sessionNumber: 1, noticed: 'Chases people for updates', reason: 'x' },
      { sessionNumber: 2, noticed: 'Chases people for updates', reason: 'y' },
    ], 'Chases people for updates')).toBe(true);
  });
  it('two different things in two sessions are not', () => {
    expect(seenInEnoughSessions([
      { sessionNumber: 1, noticed: 'Chases people for updates', reason: 'x' },
      { sessionNumber: 2, noticed: 'Absorbs everybody else\'s slack silently', reason: 'y' },
    ], 'Chases people for updates')).toBe(false);
  });
});

describe('a step is never the thing they asked for', () => {
  it('Fay, from the first batch, is the case the word check alone cannot catch, so the model is asked the same question', () => {
    /* Her words share no content word with the step. The cheap check says no; the observation
       schema carries theyAskedForThisThemselves and rule 7 of the prompt, and either answer
       suppresses. This test pins that the word check does not pretend. */
    expect(theyAskedForItThemselves(
      'Brings the dependents in early enough to change it',
      ['What I want is to stop being the only person who touches infra, and for Eli to review my PRs again.'],
    )).toBe(false);
    const lib = require('../conversation/prompt-library');
    expect(lib.COACHING_OBSERVATION_SCHEMA.input_schema.properties.theyAskedForThisThemselves.type).toBe('boolean');
    expect(lib.COACHING_OBSERVATION_PROMPT).toMatch(/must not be told to bring reviewers in/);
  });
  it('a plain overlap of the step\'s own words in one turn counts', () => {
    expect(theyAskedForItThemselves('Makes the state visible so nobody has to be chased', ['I would like the state to be visible so nobody has to chase anyone.'])).toBe(true);
  });
  it('an unrelated complaint does not', () => {
    expect(theyAskedForItThemselves('Makes the state visible so nobody has to be chased', ['I emailed Hafsah and got no reply.'])).toBe(false);
  });
  it('no step, no inversion', () => {
    expect(theyAskedForItThemselves(null, ['anything'])).toBe(false);
  });
});
