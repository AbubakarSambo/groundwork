import { knownDontAsk as whatIsSettledAndWhatIsNot, whatSetupKnowsNow, type WhatSetupHasSoFar } from './what-setup-knows';
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
    expect(whatIsSettledAndWhatIsNot(soFar)).toMatch(/do not ask for any of it again, in any words/i);
  });

  /*
   * REWRITTEN (round 5, 1 November 2026). This pinned why now on a list headed "STILL MISSING", with "setup is not finished while any
   * of them is missing". Why now left the gate in e36ba61be and stayed on this list, and the list is a reading that keeps only what it
   * is sure of, so round 5's leads were asked again for what they had said in other words (their part, their team, why now, what
   * would tell them it worked). The list now says what the reading has not found yet, and the model reads the conversation to decide.
   */
  it('says what the reading has not found yet, and that an answer in any words is an answer', () => {
    const block = whatIsSettledAndWhatIsNot({ initial: 'Fintech payments SDK migration', peopleNamed: ['Tunde'] });
    /* Changed 4 November 2026 (group 5): a named team answers who else is in it, so only the aim is still unread here. */
    expect(block).toContain('NOT READ FROM THEIR WORDS YET: What they want out of it.');
    expect(whatIsSettledAndWhatIsNot({ initial: 'Fintech payments SDK migration' })).toContain('NOT READ FROM THEIR WORDS YET: Who else is in it; What they want out of it.');
    expect(block).toContain('If they have already answered one, in any words');
    expect(block).not.toMatch(/not finished while|none of them is optional/i);
  });

  it('never lists why now as missing: it is asked once, not chased', () => {
    expect(whatIsSettledAndWhatIsNot({ initial: 'Fintech payments SDK migration' })).not.toContain('What makes now the right time');
  });

  /* Changed 3 November 2026 (no forced close): "stop asking and wrap it up" became an offer to wrap up in the model's own words. */
  it('and tells it to offer to wrap up once nothing is missing', () => {
    const block = whatIsSettledAndWhatIsNot(soFar);
    expect(block).not.toContain('NOT READ FROM THEIR WORDS YET');
    expect(block).toMatch(/NOTHING IS MISSING\. Setup has what it needs, so offer to wrap up in your own words/);
    expect(block).not.toMatch(/stop asking/i);
  });

  /* An empty array and a string of spaces are not answers. The first version of this checked the
     whole block, which fails honestly: the SETTLED list must not carry them and the MISSING list
     names one of them by the same words. So it reads only the settled half. */
  it('never claims something empty is settled', () => {
    const block = whatIsSettledAndWhatIsNot({ initial: 'A migration', goals: [], brief: '   ' });
    const settledHalf = block.split('NOT READ FROM THEIR WORDS YET')[0];
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

/*
 * ONE READING, BUILT ON THE SERVER EACH TURN (fix plan, release batch 1, group 5). The panel shows it and the model is told it as known.
 * Each case is a loop a lead in round 39 named: the team given with numbers, asked for again; a number cut short; the kind asked again.
 */
describe('what setup knows now', () => {
  it('keeps what was known when this turn read nothing new, and takes what this turn read when it did', () => {
    const before = { initial: 'School fees app adoption', goals: ['20 schools and 1000 parents paying in three months'], cadence: 'WEEKLY' };
    const now = whatSetupKnowsNow(before, { initial: 'School fees app in Uganda, adoption is slow', peopleNamed: ['Mugisha Okello'] });
    expect(now).toMatchObject({ initial: 'School fees app in Uganda, adoption is slow', goals: ['20 schools and 1000 parents paying in three months'], cadence: 'WEEKLY', peopleNamed: ['Mugisha Okello'] });
  });

  it('keeps each person with their email and number, and never replaces a whole number with part of it', () => {
    const before = { peopleNamed: ['Brian Otieno', 'Aisha Mohamed'], peoplePhones: { 'Brian Otieno': '+254 712 345 678' }, peopleEmails: { 'Aisha Mohamed': 'aisha@law.test' } };
    const now = whatSetupKnowsNow(before, { peopleNamed: ['Brian Otieno', 'Aisha Mohamed'], peoplePhones: { 'brian otieno': '712 345' } });
    expect(now.peoplePhones).toEqual({ 'Brian Otieno': '+254 712 345 678' });
    expect(now.peopleEmails).toEqual({ 'Aisha Mohamed': 'aisha@law.test' });
  });

  it('reads the kind once and names it from the one owner of situation names', () => {
    const first = whatSetupKnowsNow(null, { classifiedScenario: 'PULSE_CHECK' });
    expect(first).toMatchObject({ classifiedScenario: 'PULSE_CHECK', kindName: 'Keep a read on live work' });
    expect(whatIsSettledAndWhatIsNot({ initial: 'A read on the work', classifiedScenario: 'PULSE_CHECK' })).toContain('- The kind of check-in: Keep a read on live work');
    expect(whatSetupKnowsNow(first, { classifiedScenario: 'OKR_ALIGNMENT' }).classifiedScenario).toBe('PULSE_CHECK');
  });

  it('tells the model the team as she gave it, whole, and that it is known', () => {
    const block = whatIsSettledAndWhatIsNot(whatSetupKnowsNow(null, {
      initial: 'Track user adoption for the school fees app',
      peopleNamed: ['Mugisha Okello', 'Aisha Nakato'],
      peopleEmails: { 'Mugisha Okello': 'mugisha@startup.test' },
      peoplePhones: { 'Mugisha Okello': '+256-772-332372' },
      peopleRoles: { 'Mugisha Okello': 'signs up schools and parents' },
      goals: ['20 schools signed up', '1000 parents making payments'],
      classifiedScenario: 'PULSE_CHECK',
    }));
    expect(block).toContain('WHAT SETUP KNOWS, FROM WHAT THEY HAVE SAID. This is known: do not ask for any of it again, in any words.');
    expect(block).toContain('  - Mugisha Okello, mugisha@startup.test, +256-772-332372, signs up schools and parents');
    expect(block).toContain('  - Aisha Nakato');
    expect(block).toContain('- The kind of check-in: Keep a read on live work');
    expect(block).toContain('- What they want out of it: 20 schools signed up, 1000 parents making payments');
  });
});

describe('the name, the days and the day it happens on are part of the one reading (setup flow, 22 November 2026)', () => {
  it('are kept from turn to turn, and a newer reading wins', () => {
    const was = whatSetupKnowsNow(null, { name: 'Bill updates', workingDays: [1, 2, 3, 4, 5], cadenceAnchorDay: 1 });
    expect(was).toMatchObject({ name: 'Bill updates', workingDays: [1, 2, 3, 4, 5], cadenceAnchorDay: 1 });
    const now = whatSetupKnowsNow(was, { name: 'Bill updates from Abubakar' });
    expect(now).toMatchObject({ name: 'Bill updates from Abubakar', workingDays: [1, 2, 3, 4, 5], cadenceAnchorDay: 1 });
  });
  it('Sunday, day 0, is a day that was said', () => {
    expect(whatSetupKnowsNow(null, { cadenceAnchorDay: 0 }).cadenceAnchorDay).toBe(0);
  });
  it('are handed to the model as known, so it does not ask for them again', () => {
    const block = whatIsSettledAndWhatIsNot({ name: 'Bill updates from Abubakar', workingDays: [1, 2, 3, 4, 5], cadenceAnchorDay: 1 });
    expect(block).toMatch(/The name of the check-in: Bill updates from Abubakar/);
    expect(block).toMatch(/The days people work, 0 is Sunday: 1, 2, 3, 4, 5/);
    expect(block).toMatch(/The day it happens on \(a weekday, 0 is Sunday, or a day of the month\): 1/);
  });
});
