import { boardAs, SALES_RUN, BISI, KWAME, type Setup } from './the-switchboards-sections-harness';
import { theGlanceInASentence } from './the-glance-in-a-sentence';

/** Request 134 item 6: "1 thing is in the way, the oldest being the tax view, waiting since 29 September." */
const wait = (id: string, from: string, label: string | null, what: string, at: string) => ({
  id, groundId: 'g-1', fromParticipantId: from, onParticipantId: null, onLabel: label, what, status: 'WAITING', blockerKind: null,
  escalatedAt: null, triedSaid: null, dueSaid: null, dueOn: null, namedTheThing: true, sourceCheckInId: null, clearedAt: null, then: null,
  createdAt: new Date(at), updatedAt: new Date(at),
});
const S: Setup = { ...SALES_RUN, dependencies: [wait('w1', 'p-kwame', 'the tax view', 'the tax view', '2026-09-29T09:00:00Z')] as any };

describe('the header sentence about what is in the way', () => {
  it('says who waits, to the person waiting', async () => {
    const b: any = await boardAs(S, ...KWAME);
    expect(b.howItIsGoing.glance.inTheWay.says).toBe('One thing is in the way. You have been waiting for the tax view since 29 September.');
  });
  it('says who waits, to the lead', async () => {
    const b: any = await boardAs(S, ...BISI);
    expect(b.howItIsGoing.glance.inTheWay.says).toBe('One thing is in the way. Kwame Mensah has been waiting for the tax view since 29 September.');
  });
  it('never says "the oldest" of one thing, and says nothing is in the way when it is not', () => {
    expect(theGlanceInASentence([], () => null)).toBe('Nothing is in the way.');
    expect(theGlanceInASentence([{ who: 'You', name: 'a', raised: { firstRaisedAt: '2026-09-01' } }, { who: 'Amani', name: 'b', raised: { firstRaisedAt: '2026-08-01' } }], (d) => d)).toBe('2 things are in the way. The one waiting longest is b, since 2026-08-01.');
  });
});
