import { boardAs, SALES_RUN, BISI, KWAME, FEMI, type Setup } from './the-switchboards-sections-harness';

/** Request 132 (a) and (b), request 129 item 2: the one-line glance and the Blockers list must agree, for the lead and the person waiting. */
const wait = (id: string, from: string, label: string | null, what: string, at: string, status = 'WAITING') => ({
  id, groundId: 'g-1', fromParticipantId: from, onParticipantId: null, onLabel: label, what, status, blockerKind: null,
  escalatedAt: null, triedSaid: null, dueSaid: null, dueOn: null, namedTheThing: true, sourceCheckInId: null, clearedAt: null, then: null,
  createdAt: new Date(at), updatedAt: new Date(at),
});
const S: Setup = {
  ...SALES_RUN,
  dependencies: [
    wait('w1', 'p-kwame', 'the finance office', 'the approval for the second tranche', '2026-09-20T09:00:00Z'),
    wait('w2', 'p-femi', null, 'fuel', '2026-09-25T09:00:00Z', 'BLOCKING'),
  ] as any,
  whoSeesTargets: 'EVERYBODY',
};
const way = (b: any) => b.howItIsGoing.glance.inTheWay;

describe('the glance and the Blockers list', () => {
  it('the lead reads the same count in both', async () => {
    const b: any = await boardAs(S, ...BISI);
    expect(b.blockers.length).toBe(2);
    expect(way(b).count).toBe(b.blockers.length);
  });
  it('the person waiting reads the same count in both, and not nothing', async () => {
    const b: any = await boardAs(S, ...FEMI);
    expect((b.blockers ?? []).length).toBeGreaterThan(0);
    expect(way(b).count).toBe(b.blockers.length);
  });
  it('a reader with no wait reads none in both', async () => {
    const b: any = await boardAs(S, 'u-ngozi', 'MEMBER');
    expect(way(b).count).toBe((b.blockers ?? []).length);
  });
});
