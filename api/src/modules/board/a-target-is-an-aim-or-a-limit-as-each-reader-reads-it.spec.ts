import { PartyType } from '@prisma/client';
import { boardAs, person } from './the-switchboards-sections-harness';
import { theJourneySoFar } from './a-measure-that-goes-down-is-still-going-well';
import { whatTheWordsSuggest, whichWayItIsSaid, theQuestionAboutWhichWay, asADirection } from './an-aim-or-a-limit';

/**
 * AN AIM TO REACH, OR A LIMIT NOT TO GO OVER, AS EACH PERSON READS IT ON THE BOARD (decision 69).
 *
 * Hafsah, 1 October 2026: "instead of guessing, give each target a direction field, set when the
 * target is made: an aim to reach, or a limit not to go over". Where the lead has set it, the board
 * uses it whatever the name says. Where nobody has, the board reads the words of the name as before.
 *
 * Every line below is read off the served board, as the lead (Helen), a participant (Chidi) and an
 * admin outside the check-in.
 */
const aim = (id: string, name: string, target: number | null, count: number, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', name, target, count, prevCount: count, ownerParticipantId: null, setByParticipantId: 'p-helen', sortOrder: 0, addedAtSession: null, ...more,
});
const people = [person('p-helen', 'u-helen', 'Helen', 'Oyelaran', PartyType.INITIATOR), person('p-chidi', 'u-chidi', 'Chidi', 'Eze')];
const READERS = [['Helen, the lead', 'u-helen', 'MEMBER'], ['Chidi, taking part', 'u-chidi', 'MEMBER'], ['an admin outside the check-in', 'u-admin', 'ADMIN']] as const;

async function served(objectives: any[], userId: string, role: string, snapshots: { objectiveId: string; count: number }[]) {
  return ((await boardAs({ people, initiatorId: 'u-helen', objectives, checkIns: [], snapshots }, userId, role)).objectives ?? []) as any[];
}

describe('"Pumps sold under the new scheme" with no direction set is an aim (Hafsah\'s test)', () => {
  const PUMPS = aim('o-1', 'Pumps sold under the new scheme', 40, 45);
  for (const [who, userId, role] of READERS) {
    it(`${who} reads that the aim of 40 has been reached, never a limit`, async () => {
      const [o] = await served([PUMPS], userId, role, [{ objectiveId: 'o-1', count: 10 }]);
      expect(o.journey.say).toBe('It was 10 at the start and is 45 now, so the aim of 40 has been reached.');
      expect(o.journey.say).not.toMatch(/limit/);
      expect(o.direction).toBeNull();
    });
  }
  it('from a start of 0 it is still never told as over a limit', () => {
    const say = theJourneySoFar({ start: 0, now: 45, target: 40, name: 'Pumps sold under the new scheme' }).say;
    expect(say).not.toMatch(/limit/);
  });
  it('the words suggest an aim, and "under" before a number still suggests a limit', () => {
    expect(whatTheWordsSuggest('Pumps sold under the new scheme')).toBe('AIM');
    expect(whatTheWordsSuggest('First response under four hours')).toBe('LIMIT');
    expect(whatTheWordsSuggest('Stock-outs under 2 a month')).toBe('LIMIT');
    expect(theJourneySoFar({ start: 6, now: 3, target: 4, name: 'First response under four hours' }).say)
      .toBe('It was 6 at the start and is 3 now, within the limit of 4.');
  });
});

describe('a direction the lead set wins over the words of the name', () => {
  for (const [who, userId, role] of READERS) {
    it(`${who} reads a limit where the lead set LIMIT and the name has no limit word`, async () => {
      const SPEND = aim('o-1', 'Spending on the Kisumu trip', 180000, 254000, { direction: 'LIMIT' });
      const [o] = await served([SPEND], userId, role, [{ objectiveId: 'o-1', count: 0 }]);
      expect(o.journey.say).toBe('It was 0 at the start and is 254,000 now, which is 74,000 over the limit of 180,000.');
      expect(o.direction).toBe('LIMIT');
    });
    it(`${who} reads an aim where the lead set AIM and the name says "budget"`, async () => {
      const RAISED = aim('o-1', 'Budget raised from donors', 180000, 254000, { direction: 'AIM' });
      const [o] = await served([RAISED], userId, role, [{ objectiveId: 'o-1', count: 0 }]);
      expect(o.journey.say).toBe('It was 0 at the start and is 254,000 now, so the aim of 180,000 has been reached.');
      expect(o.journey.say).not.toMatch(/limit/);
      expect(o.direction).toBe('AIM');
    });
  }
  it('without the lead\'s direction the same two names read the old way', () => {
    expect(theJourneySoFar({ start: 0, now: 254000, target: 180000, name: 'Spending on the Kisumu trip' }).say)
      .toBe('It was 0 at the start and is 254,000 now, against 180,000.');
    expect(theJourneySoFar({ start: 0, now: 254000, target: 180000, name: 'Budget raised from donors' }).say)
      .toBe('It was 0 at the start and is 254,000 now, which is 74,000 over the limit of 180,000.');
  });
  it('a limit the lead set is named as a limit, never as something somebody is aiming for', async () => {
    const SPEND = aim('o-1', 'spending', 180000, 0, { direction: 'LIMIT' });
    const names = async (userId: string, role: string) => (await served([SPEND], userId, role, [])).map((o) => o.name);
    expect(await names('u-helen', 'MEMBER')).toEqual(['The team is keeping spending to no more than 180,000.']);
    expect(await names('u-chidi', 'MEMBER')).toEqual(['The team is keeping spending to no more than 180,000.']);
    const unset = (await served([{ ...SPEND, direction: null }], 'u-chidi', 'MEMBER', [])).map((o) => o.name);
    expect(unset).toEqual(['The team is aiming for 180,000 spending.']);
  });
  it('a limit that is one person\'s own is "you" to them and their name to the lead', async () => {
    const HIS = aim('o-1', 'fuel spending', 12000, 0, { direction: 'LIMIT', ownerParticipantId: 'p-chidi' });
    expect((await served([HIS], 'u-chidi', 'MEMBER', [])).map((o) => o.name)).toEqual(['You are keeping fuel spending to no more than 12,000.']);
    expect((await served([HIS], 'u-helen', 'MEMBER', [])).map((o) => o.name)).toEqual(['Chidi Eze is keeping fuel spending to no more than 12,000.']);
  });
});

describe('the over-limit sentence from the workplan run is still served as before', () => {
  const BUDGET = aim('o-1', 'The requested spending of 254k needs to be reconciled with the quarterly budget of 180k.', 180000, 254000);
  const OVER = 'It was 0 at the start and is 254,000 now, which is 74,000 over the limit of 180,000.';
  for (const [who, userId, role] of READERS) {
    it(`${who} reads it with no direction set, and with LIMIT set`, async () => {
      expect((await served([BUDGET], userId, role, [{ objectiveId: 'o-1', count: 0 }])).map((o) => o.journey.say)).toEqual([OVER]);
      expect((await served([{ ...BUDGET, direction: 'LIMIT' }], userId, role, [{ objectiveId: 'o-1', count: 0 }])).map((o) => o.journey.say)).toEqual([OVER]);
    });
  }
  /* Decision 86: an admin sees the figures now, so the admin reads the whole line too. This used to pin that the admin lost it. */
  it('an admin outside reads the whole line too, with LIMIT set too', async () => {
    const hers = aim('o-2', 'Helen is keeping spending within 180,000 this quarter.', 180000, 0, { ownerParticipantId: 'p-helen', setByParticipantId: 'p-helen' });
    for (const dir of [null, 'LIMIT']) {
      const rows = [{ ...BUDGET, direction: dir }, { ...hers, direction: dir }];
      const say = async (userId: string, role: string) => (await served(rows, userId, role, [{ objectiveId: 'o-1', count: 0 }])).filter((o) => o.id === 'o-1').map((o) => o.journey.say);
      expect(await say('u-admin', 'ADMIN')).toEqual([OVER]);
      expect(await say('u-chidi', 'MEMBER')).toEqual([OVER]);
      expect(await say('u-helen', 'MEMBER')).toEqual([OVER]);
    }
  });
});

describe('the question to the lead, and only to the lead', () => {
  const PUMPS = aim('o-1', 'Pumps sold under the new scheme', 40, 0);
  it('Helen is asked which way 40 goes, with what the words suggest, while nobody has said', async () => {
    const [o] = await served([PUMPS], 'u-helen', 'MEMBER', []);
    expect(o.directionQuestion).toBe('What kind of number is 40? It can be something to reach, a limit not to go over, a share to keep at or above, a date to meet, or a count to keep at zero.');
    expect(o.directionSuggested).toBe('AIM');
  });
  it('Chidi and an admin outside are never asked, and are not handed the suggestion', async () => {
    for (const [userId, role] of [['u-chidi', 'MEMBER'], ['u-admin', 'ADMIN']]) {
      const [o] = await served([PUMPS], userId, role, []);
      expect(o.directionQuestion).toBeNull();
      expect(o.directionSuggested).toBeNull();
    }
  });
  it('once Helen has set it, she is not asked again', async () => {
    const [o] = await served([{ ...PUMPS, direction: 'AIM' }], 'u-helen', 'MEMBER', []);
    expect(o.directionQuestion).toBeNull();
    expect(o.directionSuggested).toBeNull();
    expect(o.direction).toBe('AIM');
  });
  it('a target with no number has no way to go, so nobody is asked', async () => {
    const [o] = await served([aim('o-1', 'Get the new depot running', null, 0)], 'u-helen', 'MEMBER', []);
    expect(o.directionQuestion).toBeNull();
  });
});

describe('the sentences a say-back carries', () => {
  it('says each number as an aim to reach or a limit not to go over, in one sentence', () => {
    expect(whichWayItIsSaid('Pumps sold', 40, 'AIM')).toBe('"Pumps sold" is an aim of 40 to reach.');
    expect(whichWayItIsSaid('Spending this quarter.', 180000, 'LIMIT')).toBe('"Spending this quarter" is a limit of 180,000 not to go over.');
    expect(theQuestionAboutWhichWay(120000000)).toBe('What kind of number is 120 million? It can be something to reach, a limit not to go over, a share to keep at or above, a date to meet, or a count to keep at zero.');
    expect(theQuestionAboutWhichWay(null)).toBeNull();
  });
  /* Decision 75, item 17: the five kinds, and the prototype's names for the first two. It took only AIM or LIMIT. */
  it('takes the five kinds, and the prototype\'s names for them, and anything else is not set', () => {
    expect(asADirection('limit')).toBe('LIMIT');
    expect(asADirection('AIM')).toBe('AIM');
    expect(asADirection('up')).toBe('AIM');
    expect(asADirection('Lower is better')).toBe('LIMIT');
    expect(asADirection('rate')).toBe('RATE');
    expect(asADirection('DEADLINE')).toBe('DEADLINE');
    expect(asADirection('zero')).toBe('ZERO');
    expect(asADirection('sideways')).toBeNull();
    expect(asADirection(null)).toBeNull();
  });
});
