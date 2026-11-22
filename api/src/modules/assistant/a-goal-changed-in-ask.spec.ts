import { theChangeFrom, theChangeSaidBack, theChangeMade, theGoalChangeSheSaid, type ACheckInSheRuns } from './a-goal-changed-in-ask';

/*
 * A GOAL CHANGED BY ITS LEAD, SAID IN ASK (Drop Access, 22 November 2026). Wairimu told Ask the freezers were out of stock and the goal
 * was now a waitlist, and read "What you say here in Ask stays between you and Groundwork". These read what she reads now.
 */
const dropAccess: ACheckInSheRuns = {
  id: 'g1',
  label: 'Drop Access sales',
  goals: [
    { id: 'o-amani', name: 'Sell 10 freezers a week', target: 10, ownerParticipantId: 'p-amani' },
    { id: 'o-chidi', name: 'Sell 10 freezers a week', target: 10, ownerParticipantId: 'p-chidi' },
  ],
  people: [{ id: 'p-wairimu', firstName: 'Wairimu' }, { id: 'p-amani', firstName: 'Amani' }, { id: 'p-chidi', firstName: 'Chidi' }],
};
const SAID = 'Freezers are out of stock until January. The team’s goal changes now: a waitlist of 50 shops. Please change the target and tell the team.';
const READ = { changes: true, replaces: ['o-amani', 'o-chidi'], aim: 'The team is building a waitlist of 50 shops', target: 50, whose: 'The team', because: 'Freezers are out of stock until January.', stopsTheWork: true };

describe('a goal changed by its lead, said in Ask', () => {
  it('says the change back and asks her yes, in plain sentences, never the line about Ask being private', async () => {
    const engine = { extract: async () => READ };
    const found = await theGoalChangeSheSaid(engine, null, SAID, [dropAccess]);
    expect(found).not.toBeNull();
    const said = theChangeSaidBack(found!);
    expect(said).toBe('I have that the goal on “Drop Access sales” is now “The team is building a waitlist of 50 shops”, because freezers are out of stock until January. It takes the place of Amani’s “Sell 10 freezers a week” and Chidi’s “Sell 10 freezers a week”. Is that right? When you say yes, I change it, and each person in the check-in is told the new goal in their next check-in.');
    expect(said).not.toMatch(/stays between you and Groundwork/);
    expect(said).not.toContain(':');
  });

  it('tells her what changed once she says yes', () => {
    expect(theChangeMade('Drop Access sales', 'The team is building a waitlist of 50 shops.')).toBe('Done. The goal on “Drop Access sales” is now “The team is building a waitlist of 50 shops”. Each person in the check-in is told the new goal, and asked how they are doing on it, in their next check-in.');
  });

  it('changes nothing where the message changes no goal, names a goal not on record, or gives a number she never said', () => {
    expect(theChangeFrom({ changes: false }, SAID, [dropAccess])).toBeNull();
    expect(theChangeFrom({ ...READ, replaces: ['o-somebody-else'] }, SAID, [dropAccess])).toBeNull();
    const found = theChangeFrom({ ...READ, target: 70 }, SAID, [dropAccess]);
    expect(found?.change.target).toBeNull();
  });

  it('is not read at all where she runs no check-in with goals', async () => {
    let asked = false;
    const engine = { extract: async () => { asked = true; return READ; } };
    expect(await theGoalChangeSheSaid(engine, null, SAID, [{ ...dropAccess, goals: [] }])).toBeNull();
    expect(asked).toBe(false);
  });
});
