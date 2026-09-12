import { RecordEntryType as T } from '@prisma/client';
import {
  KEEP_THE_TEAM_ON_TRACK, CONNECT_GOALS_ACROSS, whatIsStillOwed, sayWhatIsMissing, stageOf,
  ASK_TWICE_THEN_LET_IT_GO, type Held,
} from './what-a-check-in-owes';

const nothing: Held = { types: [], letGo: [], answered: [] };
const ids = (o: { id: string }[]) => o.map((x) => x.id);

describe('what a check-in owes', () => {
  it('asks a lead and a team member different things in the same round', () => {
    /* The two live prompt packs for this scenario are byte-identical, so a lead and the person
       they manage got the same conversation. That is the gap this exists to close. */
    const lead = ids(whatIsStillOwed(KEEP_THE_TEAM_ON_TRACK, 'lead', 'first', nothing));
    const member = ids(whatIsStillOwed(KEEP_THE_TEAM_ON_TRACK, 'member', 'first', nothing));
    expect(lead).toContain('aim');
    expect(lead).not.toContain('own-work');
    expect(member).toContain('own-work');
    expect(member).not.toContain('aim');
  });

  it('asks a partner what they need from others, and not what they are working on', () => {
    /* Answerability, not rank: they answer for work other people did. */
    const partner = ids(whatIsStillOwed(KEEP_THE_TEAM_ON_TRACK, 'partner', 'first', nothing));
    expect(partner).toContain('needs-others');
    expect(partner).toContain('remit');
    expect(partner).not.toContain('own-work');
  });

  it('changes what it wants between the first, middle and last round', () => {
    const first = ids(whatIsStillOwed(KEEP_THE_TEAM_ON_TRACK, 'member', 'first', nothing));
    const middle = ids(whatIsStillOwed(KEEP_THE_TEAM_ON_TRACK, 'member', 'middle', nothing));
    const last = ids(whatIsStillOwed(KEEP_THE_TEAM_ON_TRACK, 'member', 'last', nothing));
    expect(first).toContain('own-work');
    expect(middle).toContain('moved');
    expect(last).toContain('achieved');
    expect(last).not.toContain('moved');
  });

  it('stops asking for something already on the record', () => {
    /* "Do not re-ask what they answered" was an instruction competing with 272 others. Here it is
       arithmetic: it is on the record, so it is not missing. */
    const held: Held = { ...nothing, types: [T.SUCCESS_DEFINITION] };
    expect(ids(whatIsStillOwed(KEEP_THE_TEAM_ON_TRACK, 'lead', 'first', held))).not.toContain('aim');
  });

  it('and never asks again for something answered in an earlier round', () => {
    /* A fact does not stop being on the record because a new round started. */
    const held: Held = { ...nothing, answered: ['moved'] };
    expect(ids(whatIsStillOwed(KEEP_THE_TEAM_ON_TRACK, 'member', 'middle', held))).not.toContain('moved');
  });

  it('lets a gap go once it has been asked to the limit', () => {
    /* Decided: record the gap, do not press. Somebody who feels cornered gives compliant answers,
       which are worse than missing ones. */
    const held: Held = { ...nothing, letGo: ['unclear'] };
    expect(ids(whatIsStillOwed(KEEP_THE_TEAM_ON_TRACK, 'member', 'first', held))).not.toContain('unclear');
    expect(ASK_TWICE_THEN_LET_IT_GO).toBe(2);
  });

  it('looks for overlap in a cascade, which nothing was looking for', () => {
    /* Two teams quietly doing the same work is the most expensive thing a cascade hides. The live
       pack asked only about dependencies. */
    const middle = ids(whatIsStillOwed(CONNECT_GOALS_ACROSS, 'lead', 'middle', nothing));
    expect(middle).toContain('overlap');
    expect(middle).toContain('conflict');
    expect(middle).toContain('depends-on');
  });

  it('still makes somebody name what their goal sits under, in their own words', () => {
    const first = ids(whatIsStillOwed(CONNECT_GOALS_ACROSS, 'member', 'first', nothing));
    expect(first).toContain('sits-under');
    expect(first).toContain('their-goal');
  });

  it('reads the stage off the round, rather than leaving a model to work it out', () => {
    expect(stageOf(1, 12)).toBe('first');
    expect(stageOf(6, 12)).toBe('middle');
    expect(stageOf(12, 12)).toBe('last');
    expect(stageOf(4, null, true)).toBe('last');
  });

  it('and never invents an ending for a run whose length nobody set', () => {
    /* Closing questions in week two, to somebody with ten weeks left. */
    expect(stageOf(9, null)).toBe('middle');
  });

  it('hands the model gaps, never questions to read out', () => {
    const still = whatIsStillOwed(KEEP_THE_TEAM_ON_TRACK, 'member', 'middle', nothing);
    const said = sayWhatIsMissing(still, 'middle');
    expect(said).toContain('understand what has changed');
    expect(said).toContain('not a list to be read out');
    expect(said).toContain('in your own words');
    /* Slots are described as absences, never phrased as questions. */
    expect(said).not.toMatch(/\?/);
  });

  it('says nothing at all when nothing is owed', () => {
    /* A heading with nothing under it reads to a model as an absence to be filled, which is how a
       check-in starts inventing things to ask. */
    expect(sayWhatIsMissing([], 'middle')).toBe('');
  });
});
