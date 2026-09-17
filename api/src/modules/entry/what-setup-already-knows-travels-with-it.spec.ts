import { whatIsSettledAndWhatIsNot, type WhatSetupHasSoFar } from './what-setup-already-knows-travels-with-it';
import { whatTheyAlreadyHave } from './setup-is-not-a-stranger-to-somebody-who-is-signed-in';

/**
 * WHAT SETUP ALREADY KNOWS HAS TO REACH THE NEXT TURN, AND WHAT IS STILL MISSING WITH IT.
 *
 * Both halves were read off one live run: a named team was dropped because the middle of the
 * conversation was re-derived from the transcript every turn, and setup finished having never asked
 * why now because nothing was tracking that it had not.
 */
describe('the settled block', () => {
  const soFar: WhatSetupHasSoFar = {
    initial: 'Fintech payments SDK migration',
    peopleNamed: ['Tunde', 'Chika'],
    whoInvolved: 'Tunde, Chika and the platform team',
    goals: ['All 12 merchants off the v2 SDK'],
  };

  it('is empty on the first turn, when a heading saying nothing is settled would be noise', () => {
    expect(whatIsSettledAndWhatIsNot(null)).toBe('');
    expect(whatIsSettledAndWhatIsNot({})).toBe('');
  });

  it('names every field that is there, in their own words', () => {
    const block = whatIsSettledAndWhatIsNot(soFar);
    expect(block).toContain('Fintech payments SDK migration');
    expect(block).toContain('Tunde, Chika');
    expect(block).toContain('the platform team');
    expect(block).toContain('All 12 merchants off the v2 SDK');
  });

  it('says not to ask for any of it again', () => {
    expect(whatIsSettledAndWhatIsNot(soFar)).toMatch(/Do not ask for any of it again/i);
  });

  /* The fault this exists for: setup ended with an empty why-now because nothing was counting. */
  it('names what is still missing, and why now is on that list', () => {
    const block = whatIsSettledAndWhatIsNot(soFar);
    expect(block).toContain('STILL MISSING');
    expect(block).toContain('What makes now the right time');
  });

  it('and tells it to stop asking once nothing is missing', () => {
    const block = whatIsSettledAndWhatIsNot({ ...soFar, decision: 'The cutover is 30 November' });
    expect(block).not.toContain('STILL MISSING');
    expect(block).toMatch(/stop asking/i);
  });

  /* An empty array and a string of spaces are not answers. The first version of this checked the
     whole block, which fails honestly: the SETTLED list must not carry them and the MISSING list
     names one of them by the same words. So it reads only the settled half. */
  it('never claims something empty is settled', () => {
    const block = whatIsSettledAndWhatIsNot({ initial: 'A migration', goals: [], brief: '   ' });
    const settledHalf = block.split('STILL MISSING')[0];
    expect(settledHalf).toContain('What this is about: A migration');
    expect(settledHalf).not.toContain('What they want out of it');
    expect(settledHalf).not.toContain('What they want the questions to focus on');
  });
});

describe('what a signed-in lead already has', () => {
  it('is nothing at all for a stranger, because the route stays open to one', () => {
    expect(whatTheyAlreadyHave(null)).toBe('');
    expect(whatTheyAlreadyHave({ theirCheckIns: [] })).toBe('');
  });

  it('names their own check-ins and what they do', () => {
    const block = whatTheyAlreadyHave({
      jobTitle: 'Head of Product',
      theirCheckIns: [{ label: 'Q3 rollout', about: 'getting the new tiers live' }],
    });
    expect(block).toContain('Head of Product');
    expect(block).toContain('Q3 rollout');
    expect(block).toContain('getting the new tiers live');
  });

  /*
   * THE WALL. Participants' words reach their own report and nothing else, and a setup conversation
   * is the last place to put a door in it. This only ever takes labels and the lead's own brief, so
   * there is no field here that could carry somebody else's sentence - the test is that the shape
   * offers nowhere to put one.
   */
  it('takes a label and the lead own brief, and has nowhere to put anybody else words', () => {
    const block = whatTheyAlreadyHave({ theirCheckIns: [{ label: 'Q3 rollout' }] });
    expect(block).toContain('Q3 rollout');
    expect(block).toMatch(/never assume this new\s+situation is one of these/i);
  });

  it('stops at a handful, because a longer list is a list rather than context', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ label: `Check-in ${i + 1}` }));
    const block = whatTheyAlreadyHave({ theirCheckIns: many });
    expect(block).toContain('Check-in 5');
    expect(block).not.toContain('Check-in 6');
  });
});
