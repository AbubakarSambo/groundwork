import { readFileSync } from 'fs';
import { join } from 'path';
import { route } from './the-router-is-deterministic';

/**
 * THE COACH ALREADY EXISTED. THIS LANE ASKS IT FROM SOMEWHERE ELSE.
 *
 * `CoachingState` has been written on every completed check-in for a long time, by a state machine
 * with rules earned the hard way: one step at a time and never a list; a step that goes unmanaged
 * twice changes rather than repeating; nothing ever accumulates into a judgement.
 *
 * Building a second coach for the panel would have given somebody two answers about themselves from
 * one product, and the second one would have been the worse of the two - written quickly, against
 * the same person, with none of that history behind it.
 */
const SRC = readFileSync(join(__dirname, 'assistant.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const LANE = SRC.slice(SRC.indexOf('private async howAmIDoing('), SRC.indexOf('private async whatDidISay('));

describe('there is only one coach', () => {
  it('reads the existing state and computes no step of its own', () => {
    expect(LANE).toMatch(/coachingState\.findFirst/);
    /* No staircase logic, no outcome handling, no history walking. That machine is next door. */
    expect(LANE).not.toMatch(/afterOutcome|staircasePosition|nextStep\(/);
  });

  it('takes the most recent, because a person is in more than one check-in', () => {
    /* An older ground's step is not wrong, it is finished. */
    expect(LANE).toMatch(/orderBy: \{ updatedAt: 'desc' \}/);
  });

  it('is scoped to the organisation as well as the person', () => {
    expect(LANE).toMatch(/ground: \{ organizationId \}/);
  });
});

describe('a question about how somebody is doing gets a step, not an assessment', () => {
  it('says there is no step rather than saying they are doing fine', () => {
    /*
     * Inventing an assessment out of an absence is exactly what this must not do. "You are doing
     * well" from a machine that has nothing to go on is a verdict with no evidence, which is worse
     * than silence and much worse than saying so.
     */
    expect(LANE).toMatch(/not a verdict either way/i);
  });

  it('offers ONE step and never a list', () => {
    /* Somebody handed five things does none of them. */
    expect(LANE).toMatch(/One thing, from your last check-in/);
    expect(LANE).not.toMatch(/\.map\(|join\('\\n'\)/);
  });

  it('carries no score, streak or count anywhere', () => {
    for (const word of ['score', 'streak', 'rating', 'percent', 'rank', 'grade']) {
      expect(LANE.toLowerCase()).not.toContain(word);
    }
  });

  it('and tells them how to change a step that does not fit', () => {
    /* A step somebody cannot do is information about the step. Without saying that, the only way
       out is to fail it twice. */
    expect(LANE).toMatch(/saying so in your next check-in changes it/);
  });
});

describe('the question routes before the recall lane', () => {
  it('because "how am I doing" is not a question about what they said', () => {
    expect(route('how am I doing?').lane).toBe('how_am_i_doing');
    expect(route("I'm stuck").lane).toBe('how_am_i_doing');
    expect(route('how do I get better').lane).toBe('how_am_i_doing');
    /* And the recall lane still owns its own shape. */
    expect(route('what did I say about the vendor').lane).toBe('what_did_i_say');
  });
});
