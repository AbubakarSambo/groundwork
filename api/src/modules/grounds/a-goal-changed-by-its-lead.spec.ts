import { theGoalAsItWas, theChangeToMake, theGoalChangesOn, theChangeThatMadeThisGoal, theChangeAsASentence, type AGoalOnRecord } from './a-goal-changed-by-its-lead';
import { buildIntakeBlock, READ_THE_AIMS } from '../conversation/prompt-library';
import { theMaterialAsText } from '../conversation/the-assessment';
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

  it('says whose each old goal was', () => {
    expect(theGoalAsItWas(onRecord[0], people)).toBe('Amani’s “Sell 10 freezers a week”');
    expect(theGoalAsItWas({ ...onRecord[0], ownerParticipantId: null }, people)).toBe('the team’s “Sell 10 freezers a week”');
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
      { objectiveId: 'o-amani', from: 10, to: 50, fromNames: ['Amani’s “Sell 10 freezers a week”', 'Chidi’s “Sell 10 freezers a week”'], toName: 'The team is building a waitlist of 50 names', because: 'Freezers are out of stock.', stopsTheWork: true, byParticipantId: 'p-wairimu', said: 'yes', at: '2026-11-22T09:00:00.000Z' },
    ] };
    const changes = theGoalChangesOn(log);
    expect(changes).toHaveLength(2);
    expect(theChangeThatMadeThisGoal(changes, 'o-old')).toBeNull();
    const said = theChangeAsASentence(theChangeThatMadeThisGoal(changes, 'o-amani')!, ['Wairimu', 'Amani', 'Chidi']);
    expect(said).toBe('On 22 November the goal changed, because freezers are out of stock. Before that, the goals were Amani’s “Sell 10 freezers a week” and Chidi’s “Sell 10 freezers a week”.');
    expect(said).not.toContain(':');
  });

  it('the lead\'s read names a goal she changed by its id, and only with her yes', () => {
    expect(READ_THE_AIMS).toContain('A GOAL THE LEAD CHANGED IS THAT GOAL, NOT A NEW ONE');
    expect(READ_THE_AIMS).toContain('for a change she has not agreed to');
    const material = theMaterialAsText({ who: 'Wairimu Njoroge', isTheLead: true, checkIn: 'Freezer sales', givenRole: null, priorities: [], goalsOnRecord: [{ id: 'o-amani', name: 'Sell 10 freezers a week', target: 10 }], turns: [], setup: null, draft: { claims: [], lines: [] }, previous: null, openPromises: [] } as any);
    expect(material).toContain('[o-amani] Sell 10 freezers a week, 10');
  });

  it('tells a team member the goal changed, and tells the lead to say a change back and wait for her yes', () => {
    const objectives = [{ name: 'The team is building a waitlist of 50 names.', target: 50, changed: 'On 22 November the goal changed, because freezers are out of stock.' }];
    const member = buildIntakeBlock({ scenario: 'OKR_ALIGNMENT', partyType: PartyType.PARTICIPANT, sessionNumber: 2, objectives } as any);
    expect(member).toContain('On 22 November the goal changed, because freezers are out of stock.');
    expect(member).toContain('ask how they are doing on it');
    expect(member).not.toContain('CHANGING A GOAL');
    const lead = buildIntakeBlock({ scenario: 'OKR_ALIGNMENT', partyType: PartyType.INITIATOR, sessionNumber: 2, objectives } as any);
    expect(lead).toContain('asking whether that is right. Change nothing until they say yes.');
    expect(lead).not.toContain('A GOAL CHANGED');
  });
});
