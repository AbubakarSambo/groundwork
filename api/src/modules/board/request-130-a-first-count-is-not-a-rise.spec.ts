import { boardAs, SALES_RUN, BISI, FEMI, type Setup } from './the-switchboards-sections-harness';

/** Request 130 (a): the first count of a number was read as a rise from 0, "81 now, up from 0", by both readers. */
const obj = (count: number, prevCount: number) => ({
  id: 'o-1', groundId: 'g-1', name: 'Orders dispatched on time', target: 95, count, prevCount, ownerParticipantId: null, setByParticipantId: 'p-bisi', sortOrder: 0, addedAtSession: null, assumes: [], direction: 'AIM',
});
const first: Setup = { ...SALES_RUN, whoSeesTargets: 'EVERYBODY', objectives: [obj(81, 0)] as any, snapshots: [{ objectiveId: 'o-1', sessionNumber: 2, count: 0 }] as any };
const later: Setup = { ...first, objectives: [obj(81, 60)] as any, snapshots: [{ objectiveId: 'o-1', sessionNumber: 1, count: 60 }, { objectiveId: 'o-1', sessionNumber: 2, count: 81 }] as any };

describe('the first count of a number', () => {
  it.each([['the lead', 'lead'], ['a participant', 'femi']])('is not read as a rise by %s', async (_n, who) => {
    const b: any = await (who === 'lead' ? boardAs(first, ...BISI) : boardAs(first, ...FEMI));
    const o = b.objectives.find((x: any) => x.id === 'o-1');
    expect(o.prevCount).toBeNull();
    expect(o.delta).toBe(0);
    expect(o.journey.say).not.toMatch(/at the start|up from/i);
    expect(o.journey.say).toMatch(/81/);
  });

  it('is still a rise once there is a count before it', async () => {
    const b: any = await boardAs(later, ...BISI);
    const o = b.objectives.find((x: any) => x.id === 'o-1');
    expect(o.prevCount).toBe(60);
    expect(o.delta).toBe(21);
    expect(o.journey.say).toMatch(/60 at the start/);
  });
});
