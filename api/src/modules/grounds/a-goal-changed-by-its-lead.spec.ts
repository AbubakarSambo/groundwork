import { theChangeToMake, theGoalChangesOn, theChangeThatMadeThisGoal, theChangeAsASentence, type AGoalOnRecord } from './a-goal-changed-by-its-lead';
import { buildIntakeBlock, EXPECTATION_PROMPT, EXPECTATION_SCHEMA } from '../conversation/prompt-library';
import { PartyType } from '@prisma/client';

/*
 * A GOAL CHANGED BY ITS LEAD (Drop Access and RHEA Soil, 22 November 2026). Wairimu set "each agent sells 10 freezers a week" at setup;
 * then the freezers ran out and she said the goal this week is a waitlist of 50 names. These read what each person is given.
 */
const onRecord: AGoalOnRecord[] = [
  { id: 'o-amani', name: 'Sell 10 freezers a week', target: 10, ownerParticipantId: 'p-amani' },
  { id: 'o-chidi', name: 'Sell 10 freezers a week', target: 10, ownerParticipantId: 'p-chidi' },
];
const people = [{ id: 'p-wairimu', firstName: 'Wairimu' }, { id: 'p-amani', firstName: 'Amani' }, { id: 'p-chidi', firstName: 'Chidi' }];
const herNumbers = new Set([50]);

describe('a goal changed by its lead', () => {
  it('replaces both freezer goals with the one team waitlist, keeping her reason', () => {
    const c = theChangeToMake({ replaces: ['o-amani', 'o-chidi'], aim: 'The team is building a waitlist of 50 names', target: 50, whose: 'The team', because: 'Freezers are out of stock.', stopsTheWork: true }, onRecord, people, (n) => herNumbers.has(n));
    expect(c).not.toBeNull();
    expect(c!.keep.id).toBe('o-amani');
    expect(c!.drop.map((d) => d.id)).toEqual(['o-chidi']);
    expect(c!.ownerParticipantId).toBeNull();
    expect(c!.target).toBe(50);
    expect(c!.stopsTheWork).toBe(true);
  });

  it('changes nothing for a goal that is not on record, or a number she never said', () => {
    expect(theChangeToMake({ replaces: ['o-nobody'], aim: 'The team is building a waitlist', whose: 'The team' }, onRecord, people, () => true)).toBeNull();
    const c = theChangeToMake({ replaces: ['o-amani'], aim: 'Amani builds a waitlist of 70 names', target: 70, whose: 'Amani' }, onRecord, people, (n) => herNumbers.has(n));
    expect(c!.target).toBeNull();
    expect(c!.ownerParticipantId).toBe('p-amani');
  });

  it('reads the change back as plain sentences, with no colon, and a name keeps its capital', () => {
    const log = { timeline: [], targetChanges: [
      { objectiveId: 'o-old', from: 3, to: 4, byParticipantId: 'p-wairimu', said: 'make it 4', at: '2026-11-20T08:00:00.000Z' },
      { objectiveId: 'o-amani', from: 10, to: 50, fromNames: ['Amani sells 10 freezers a week', 'Chidi sells 10 freezers a week'], toName: 'The team is building a waitlist of 50 names', because: 'Freezers are out of stock.', stopsTheWork: true, byParticipantId: 'p-wairimu', said: 'yes', at: '2026-11-22T09:00:00.000Z' },
    ] };
    const changes = theGoalChangesOn(log);
    expect(changes).toHaveLength(2);
    expect(theChangeThatMadeThisGoal(changes, 'o-old')).toBeNull();
    const said = theChangeAsASentence(theChangeThatMadeThisGoal(changes, 'o-amani')!, ['Wairimu', 'Amani', 'Chidi']);
    expect(said).toBe('On 22 November the goal changed, because freezers are out of stock. Before that, the goals were that Amani sells 10 freezers a week and that Chidi sells 10 freezers a week.');
    expect(said).not.toContain(':');
  });

  it('asks the model for a change only with her yes', () => {
    expect(EXPECTATION_PROMPT).toContain('ONLY WITH THEIR YES');
    expect((EXPECTATION_SCHEMA.input_schema.properties as any).goalChanges.items.required).toEqual(['replaces', 'aim', 'whose']);
  });

  it('tells a team member the goal changed, and tells the lead to say a change back and wait for her yes', () => {
    const objectives = [{ name: 'The team is building a waitlist of 50 names.', target: 50, changed: 'On 22 November the goal changed, because freezers are out of stock.' }];
    const member = buildIntakeBlock({ scenario: 'OKR_ALIGNMENT', partyType: PartyType.PARTICIPANT, sessionNumber: 2, objectives } as any);
    expect(member).toContain('On 22 November the goal changed, because freezers are out of stock.');
    expect(member).toContain('ask how they are doing on it');
    expect(member).not.toContain('CHANGING A GOAL');
    const lead = buildIntakeBlock({ scenario: 'OKR_ALIGNMENT', partyType: PartyType.INITIATOR, sessionNumber: 2, objectives } as any);
    expect(lead).toContain('ask them to say yes. Change nothing until they say yes.');
    expect(lead).not.toContain('A GOAL CHANGED');
  });
});
