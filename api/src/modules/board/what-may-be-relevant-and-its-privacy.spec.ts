import { whatMayBeRelevant, whatWasSaidNotRelevant, readWhatMayBeRelevant, type AKeptMemory } from './what-may-be-relevant';

const kept = (over: Partial<AKeptMemory> = {}): AKeptMemory => ({
  id: 'm1', status: 'KEPT', text: 'Check stock before a new rep starts, because Kwame’s first month was held up by three weeks of stock delays',
  groundId: 'g-kwame', keptAt: new Date('2026-09-21T09:00:00Z'), keptByFirstName: null, keptByTheReader: false, ...over,
});
const scenarios = new Map([['g-kwame', 'NEW_HIRE'], ['g-sales', 'OKR_ALIGNMENT'], ['g-faith', 'NEW_HIRE']]);

describe('what may be relevant to a new check-in', () => {
  it('offers what was kept from another check-in of the same kind, and when the organisation kept it', () => {
    expect(whatMayBeRelevant({ groundId: 'g-faith', scenario: 'NEW_HIRE', memories: [kept()], scenarioOf: scenarios, notRelevant: [] })).toEqual([
      { id: 'm1', says: 'Check stock before a new rep starts, because Kwame’s first month was held up by three weeks of stock delays.', whoConfirmedIt: 'It was kept for the whole organisation on 21 September.' },
    ]);
  });
  it('says "You" only to the lead who kept it', () => {
    expect(whatMayBeRelevant({ groundId: 'g-faith', scenario: 'NEW_HIRE', memories: [kept({ keptByTheReader: true })], scenarioOf: scenarios, notRelevant: [] })[0].whoConfirmedIt).toBe('You confirmed it on 21 September.');
  });
  it('leaves out another kind of check-in, this check-in’s own, and what was said not to be relevant', () => {
    const memories = [kept({ id: 'a', groundId: 'g-sales' }), kept({ id: 'b', groundId: 'g-faith' }), kept({ id: 'c' })];
    expect(whatMayBeRelevant({ groundId: 'g-faith', scenario: 'NEW_HIRE', memories, scenarioOf: scenarios, notRelevant: ['c'] })).toEqual([]);
  });
  it('reads what was said not to be relevant from the check-in’s own record', () => {
    expect(whatWasSaidNotRelevant({ notRelevant: { memoryIds: ['m1'] } })).toEqual(['m1']);
    expect(whatWasSaidNotRelevant(null)).toEqual([]);
  });
});

/*
 * PRIVACY: ONLY WHAT THE ORGANISATION'S MEMORY ALREADY LETS THIS LEAD READ. An item another lead has not said yes to
 * keeping for the whole organisation (still OFFERED, which is that lead's own question from their own check-in) never
 * appears, even when it is handed in; the database is asked for KEPT items alone; and a reader the memory's own rule
 * does not let read what is kept is served nothing at all.
 */
describe('what may be relevant, behind the organisation memory’s own wall', () => {
  const ground = { id: 'g-faith', organizationId: 'org', scenario: 'NEW_HIRE', groundAuditLog: null };
  const another = { id: 'private', status: 'OFFERED', text: 'Kwame keeps missing his targets and I am thinking of letting him go', groundId: 'g-kwame', keptAt: null, keptById: null };
  const fakePrisma = (rows: any[]) => {
    const calls: any[] = [];
    return {
      calls,
      organizationMemory: { findMany: async (q: any) => { calls.push(q); return rows.filter((r) => !q.where.status || r.status === q.where.status); } },
      ground: { findMany: async () => [{ id: 'g-kwame', scenario: 'NEW_HIRE' }] },
    };
  };

  it('never shows an item another lead has not kept for the whole organisation', () => {
    expect(whatMayBeRelevant({ groundId: 'g-faith', scenario: 'NEW_HIRE', memories: [kept({ id: 'private', status: 'OFFERED', text: another.text })], scenarioOf: scenarios, notRelevant: [] })).toEqual([]);
  });

  it('asks the database for kept items alone, and serves none of another lead’s private material', async () => {
    const prisma = fakePrisma([another, { id: 'm1', status: 'KEPT', text: 'Check stock before a new rep starts', groundId: 'g-kwame', keptAt: new Date('2026-09-21T09:00:00Z'), keptById: 'u-other' }]);
    const out = await readWhatMayBeRelevant(prisma, ground, { userId: 'u-wairimu', role: 'LEAD' }, async () => true);
    expect(prisma.calls[0].where.status).toBe('KEPT');
    expect(out.map((o) => o.id)).toEqual(['m1']);
    expect(JSON.stringify(out)).not.toContain('letting him go');
    expect(JSON.stringify(out)).not.toContain('u-other');
  });

  it('serves nothing to a reader the memory’s own rule does not let read what is kept', async () => {
    const prisma = fakePrisma([{ id: 'm1', status: 'KEPT', text: 'Check stock before a new rep starts', groundId: 'g-kwame', keptAt: new Date(), keptById: 'u-other' }]);
    expect(await readWhatMayBeRelevant(prisma, ground, { userId: 'u-guest', role: 'GUEST' }, async () => false)).toEqual([]);
    expect(prisma.calls).toEqual([]);
  });
});
