import { GroundScenario, GroundMode, PartyType } from '@prisma/client';
import { forTheLeadFrom, type Reader } from './what-today-reads-from-the-record';

/**
 * DECISION 56, ITEM 1: the lead's Today list nudges them to tell the person about a goal they wrote
 * and have not told them about yet - "Tell Tobi about taking over the scheduling. You set this goal
 * and have not told him yet" (reworded to use his name throughout, decision 56's own instruction).
 * ITEM 4: a week on, the nudge says the person has now been told plainly, with no number.
 */
const LEAD = { id: 'p-wanjiru', userId: 'u-wanjiru', partyType: PartyType.INITIATOR, email: 'w@x.test', roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly: true, createdAt: new Date('2026-09-01'), user: { firstName: 'Wanjiru', lastName: 'Mwangi' } };
const TOBI = { id: 'p-tobi', userId: 'u-tobi', partyType: PartyType.PARTICIPANT, email: 't@x.test', roleAsDescribed: null, nameGiven: null, organisationGiven: null, managingOnly: false, createdAt: new Date('2026-09-02'), user: { firstName: 'Tobi', lastName: 'Adewale' } };

function groundWith(goal: any) {
  return {
    initiatorId: 'u-wanjiru',
    whoSeesTargets: 'EVERYBODY',
    participants: [LEAD, TOBI],
    dependencies: [],
    objectives: [],
    personObjectives: goal ? [goal] : [],
  };
}

const reader: Reader = { userId: 'u-wanjiru', isAdmin: false };
/* The worded area (the-area-of-a-goal-is-worded-once.ts) is read from WordedLine; stubbed here as
   already kept, so these tests exercise the sentence-building, not the model call. */
const prisma: any = {
  groundContextItem: { findMany: async () => [] },
  wordedLine: { findUnique: async () => ({ text: 'the scheduling and the stock counts' }) },
};

describe('the lead is nudged to tell them (decision 56)', () => {
  it('within the first week: nudges the lead, using the name, never a pronoun', async () => {
    const ground = groundWith({
      id: 'o-not-told', participantId: 'p-tobi', text: 'Take over the scheduling.',
      /* Two days ago, by the clock the code reads: a fixed date here stopped being "within the first
         week" once a week had passed in real time (1 October 2026). */
      authoredBy: 'lead', awareness: 'NOT_TOLD', createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    });
    const out = await forTheLeadFrom(prisma, 'g1', { ground, participants: ground.participants, checkIns: [], nameOf: (pid: string) => (pid === 'p-tobi' ? 'Tobi' : 'Wanjiru') } as any, reader);
    const item = out!.find((x) => x.id === 'not-told-o-not-told');
    expect(item).toBeTruthy();
    expect(item!.decide).toBe('Tell Tobi about the goal you set for the scheduling and the stock counts.');
    expect(item!.why).toBe('You have not told Tobi yet.');
    expect(item!.why).not.toMatch(/\bhim\b|\bher\b/i);
    expect(item!.decide).not.toMatch(/\d/);
  });

  it('after a week not told: says the person has now been told plainly, and reminds the lead once', async () => {
    const ground = groundWith({
      id: 'o-week', participantId: 'p-tobi', text: 'Take over the scheduling.',
      authoredBy: 'lead', awareness: 'NOT_TOLD', createdAt: new Date('2026-09-01'),
    });
    const out = await forTheLeadFrom(prisma, 'g1', { ground, participants: ground.participants, checkIns: [], nameOf: (pid: string) => (pid === 'p-tobi' ? 'Tobi' : 'Wanjiru') } as any, reader);
    const item = out!.find((x) => x.id === 'not-told-o-week');
    expect(item!.why).toBe(
      'You have not told Tobi yet. It has been a week, so Tobi has now been told that a goal exists, without any number. Talk it through with Tobi yourself.',
    );
    /* Full sentences, never a dash join. */
    expect(item!.why).not.toContain(' - ');
  });

  it('a goal the person wrote themselves is never a nudge', async () => {
    const ground = groundWith({
      id: 'o-self', participantId: 'p-tobi', text: 'My own goal.',
      authoredBy: 'self', awareness: 'NOT_TOLD', createdAt: new Date('2026-09-01'),
    });
    const out = await forTheLeadFrom(prisma, 'g1', { ground, participants: ground.participants, checkIns: [], nameOf: (pid: string) => (pid === 'p-tobi' ? 'Tobi' : 'Wanjiru') } as any, reader);
    expect(out!.some((x) => x.id === 'not-told-o-self')).toBe(false);
  });

  it('a goal already told is never a nudge', async () => {
    const ground = groundWith({
      id: 'o-told', participantId: 'p-tobi', text: 'Lead the client conversations fully.',
      authoredBy: 'lead', awareness: 'TOLD', createdAt: new Date('2026-09-01'),
    });
    const out = await forTheLeadFrom(prisma, 'g1', { ground, participants: ground.participants, checkIns: [], nameOf: (pid: string) => (pid === 'p-tobi' ? 'Tobi' : 'Wanjiru') } as any, reader);
    expect(out!.some((x) => x.id === 'not-told-o-told')).toBe(false);
  });

  it('nobody but the lead gets this list at all', async () => {
    const ground = groundWith({
      id: 'o-not-told', participantId: 'p-tobi', text: 'Take over the scheduling.',
      authoredBy: 'lead', awareness: 'NOT_TOLD', createdAt: new Date('2026-09-25'),
    });
    const asTobi: Reader = { userId: 'u-tobi', isAdmin: false };
    const out = await forTheLeadFrom(prisma, 'g1', { ground, participants: ground.participants, checkIns: [], nameOf: (pid: string) => (pid === 'p-tobi' ? 'Tobi' : 'Wanjiru') } as any, asTobi);
    expect(out).toBeNull();
  });
});

/*
 * PILOTS AFTER FIXES, 14 OCTOBER (A2): Grace read "Tell Joseph about the goal you set for Product sampling" about "Provide
 * samples to Mercy", a promise, and Njeri read "the goal you set for Documentation for Aisha Hassan" about a to-do. Neither
 * set a goal. Only a goal the record holds as one is nudged.
 */
describe('only a goal the lead set is "a goal you set"', () => {
  const nudgesFor = async (kind: string | null) => {
    const ground = groundWith({ id: 'o-1', participantId: 'p-tobi', text: 'Provide samples to Mercy', authoredBy: 'lead', awareness: 'NOT_TOLD', kind, createdAt: new Date(Date.now() - 86_400_000) });
    const out = await forTheLeadFrom(prisma, 'g1', { ground, participants: ground.participants, checkIns: [], nameOf: (pid: string) => (pid === 'p-tobi' ? 'Tobi' : 'Wanjiru') } as any, reader);
    return (out ?? []).filter((x) => x.id === 'not-told-o-1');
  };
  it('a promise or a to-do is never nudged as a goal', async () => {
    expect(await nudgesFor('COMMITMENT')).toEqual([]);
    expect(await nudgesFor('TODO')).toEqual([]);
  });
  it('a goal, a target, and an old row with no kind still are', async () => {
    expect(await nudgesFor('GOAL')).toHaveLength(1);
    expect(await nudgesFor('TARGET')).toHaveLength(1);
    expect(await nudgesFor(null)).toHaveLength(1);
  });
});
