import { onboardingIsReady, theAimIsSettled, anAimIsOwedHere, whatSetupNeverGot, NO_AIM_BY_DESIGN } from './a-check-in-with-no-aim-has-nothing-to-read-against';

const THE_OTHER_THREE = { mode: 'something_new', initial: 'a migration', decision: 'the cutover is in November' };

/**
 * A CHECK-IN WITH NO AIM HAS NOTHING TO READ AGAINST.
 *
 * Measured on 18 September 2026 across all 22 situations, each set up by a lead whose every answer
 * was true and thin: setup captured what the situation was about 20 times and captured AN AIM THREE
 * TIMES. Most of them finished anyway, because the gate asked for what kind of thing this is, what
 * it is about, and why now - and none of those is a target.
 */
/*
 * THE GATE DOES NOT REQUIRE THE AIM, AND THE HEAD OF THE MODULE HOLDS THE THREE MEASUREMENTS THAT
 * SAY WHY. What is tested here is that the reasoning survives unwired: `theAimIsSettled` still knows
 * what a settled aim is and which situations are exempt, so the next attempt starts from this rather
 * than rediscovering it.
 */
describe('the gate', () => {
  it('opens on the three fields it has always asked for', () => {
    expect(onboardingIsReady(THE_OTHER_THREE, 'OKR_ALIGNMENT')).toBe(true);
  });

  it('and does not wait for an aim, which measured worse three times', () => {
    expect(onboardingIsReady(THE_OTHER_THREE, 'OKR_ALIGNMENT')).toBe(true);
    expect(onboardingIsReady({ ...THE_OTHER_THREE, goals: ['all 12 merchants off v2 by 30 November'] }, 'OKR_ALIGNMENT')).toBe(true);
  });

  /* Why now no longer holds the gate (first experience, round 2, 31 October 2026: asked four times of a lead who had answered it). */
  it('still needs the situation and what it is about, and not why now', () => {
    expect(onboardingIsReady({ initial: 'a thing', decision: 'because' }, 'DRIFT')).toBe(false);
    expect(onboardingIsReady({ mode: 'x', decision: 'because' }, 'DRIFT')).toBe(false);
    expect(onboardingIsReady({ mode: 'x', initial: 'a thing' }, 'DRIFT')).toBe(true);
  });
});

/**
 * AND THE ORGANS STAY IN. Three situations have no aim on purpose and forcing one would break each
 * of them in a different way: SNAPSHOT's own pack says "DO NOT SET UP ANYTHING"; PULSE_CHECK's
 * target is given by each PERSON in their own first session, not by the lead at setup; and OPEN_READ
 * exists precisely because nobody knows the shape yet.
 */
describe('the situations that have no aim by design', () => {
  it('are the five, and no others', () => {
    /* And DISCOVERY, which asks a room what they know: nobody in it is being read against anything. */
    expect([...NO_AIM_BY_DESIGN].sort()).toEqual(['DISCOVERY', 'OPEN_READ', 'PULSE_CHECK', 'SNAPSHOT', 'TEAM_UPDATES']);
  });

  it('are known to owe no aim', () => {
    for (const s of NO_AIM_BY_DESIGN) expect(anAimIsOwedHere(s)).toBe(false);
  });

  it('while every other situation owes one', () => {
    for (const s of ['OKR_ALIGNMENT', 'NEW_HIRE', 'PIP', 'CRISIS_ALIGNMENT', 'DRIFT', 'ROLE_HANDOVER']) {
      expect(anAimIsOwedHere(s)).toBe(true);
    }
  });

  /* An unknown or missing situation owes one: the safe side of this is asking. */
  it('and an unknown situation owes one', () => {
    expect(anAimIsOwedHere(undefined)).toBe(true);
    expect(anAimIsOwedHere('SOMETHING_NEW_WE_ADDED')).toBe(true);
  });
});

describe('what setup never got', () => {
  /* whatSetupNeverGot still names it, because the log is where an unasked aim shows up now. */
  it('names the aim among the missing, in words a person would use', () => {
    expect(whatSetupNeverGot(THE_OTHER_THREE, 'OKR_ALIGNMENT')).toEqual(['an aim to read the work against']);
  });

  it('and says nothing about an aim where none is owed', () => {
    expect(whatSetupNeverGot(THE_OTHER_THREE, 'SNAPSHOT')).toEqual([]);
  });

  it('and theAimIsSettled is the one place that decides it', () => {
    expect(theAimIsSettled({}, 'SNAPSHOT')).toBe(true);
    expect(theAimIsSettled({}, 'PIP')).toBe(false);
    expect(theAimIsSettled({ goals: [] }, 'PIP')).toBe(false);
    expect(theAimIsSettled({ goals: ['reports in by the 5th'] }, 'PIP')).toBe(true);
  });
});
