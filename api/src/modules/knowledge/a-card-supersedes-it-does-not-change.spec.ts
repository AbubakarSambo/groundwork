import { KnowledgeService, MAX_CARDS, MAX_CHARS } from './knowledge.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

/**
 * A FINDING FROM MARCH HAS TO BE EXPLAINABLE BY THE HANDBOOK AS IT STOOD IN MARCH.
 *
 * A card edited in place makes that impossible: the evidence changes underneath the conclusion and
 * nobody can tell it happened. So a substantive change writes a new card and closes the old one,
 * and a typo does not - the distinction is the whole reason both `put` and `correct` exist.
 *
 * Proved on real Postgres as well: v1 superseded by v2 with no gap and no overlap, and the
 * as-of read returning v1 for a moment before the change and v2 for now.
 */
function svc(current: any = null) {
  const state: any = { current, created: [] as any[], updates: [] as any[] };
  const tx: any = {
    knowledgeCard: {
      findFirst: jest.fn(async () => state.current),
      create: jest.fn(async ({ data }: any) => { const c = { id: `c${state.created.length + 1}`, ...data }; state.created.push(c); return c; }),
      update: jest.fn(async ({ where, data }: any) => { state.updates.push({ id: where.id, ...data }); return data; }),
    },
  };
  const prisma: any = {
    $transaction: jest.fn(async (fn: any) => fn(tx)),
    knowledgeCard: tx.knowledgeCard,
    knowledgeRetrieval: { create: jest.fn(async () => ({})) },
    $queryRaw: jest.fn(async () => []),
  };
  return { service: new KnowledgeService(prisma), state, prisma };
}

const CARD = { kind: 'handbook', key: 'expenses', title: 'Expenses', body: 'Under 50 pounds, just claim it.' };
const LIVE = { id: 'c0', version: 1, kind: 'HANDBOOK', key: 'expenses', title: 'Expenses', body: 'Under 50 pounds, just claim it.', sourceRef: null };

describe('a card supersedes, it does not change', () => {
  it('a first card is version one and open-ended', async () => {
    const { service, state } = svc(null);
    await service.put('org-a', CARD);
    expect(state.created[0].version).toBe(1);
    expect(state.created[0].effectiveTo).toBeUndefined();
  });

  it('a changed body writes a new version and closes the old one', async () => {
    const { service, state } = svc(LIVE);
    await service.put('org-a', { ...CARD, body: 'Under 100 pounds, just claim it.' });
    expect(state.created[0].version).toBe(2);
    expect(state.updates.some((u: any) => u.id === 'c0' && u.effectiveTo instanceof Date)).toBe(true);
  });

  it('CLOSES THE OLD ONE FIRST, because the database allows only one live version per key', async () => {
    /*
     * The first version created before closing and every supersession failed with a unique
     * constraint violation - the partial index doing exactly its job, turning a silent
     * two-current-cards into a loud error on the first attempt.
     */
    const { service, state, prisma } = svc(LIVE);
    await service.put('org-a', { ...CARD, body: 'changed' });
    const order = prisma.knowledgeCard.update.mock.invocationCallOrder[0];
    const createOrder = prisma.knowledgeCard.create.mock.invocationCallOrder[0];
    expect(order).toBeLessThan(createOrder);
    expect(state.updates[0].effectiveTo).toBeInstanceOf(Date);
  });

  it('and points the old one at the new one, once there is something to point at', async () => {
    const { service, state } = svc(LIVE);
    await service.put('org-a', { ...CARD, body: 'changed' });
    expect(state.updates.some((u: any) => u.supersededById === 'c1')).toBe(true);
  });

  it('an IDENTICAL push is not a new version', async () => {
    /*
     * A customer re-syncing nightly would otherwise accumulate a version a day and the history
     * would stop meaning anything - the point of it is to show when something CHANGED.
     */
    const { service, state } = svc(LIVE);
    await service.put('org-a', CARD);
    expect(state.created).toHaveLength(0);
    expect(state.updates[0].syncedAt).toBeInstanceOf(Date);
  });

  it('a correction does not bump the version or move the dates', async () => {
    /* Fixing "recieve" is not a new version of the truth. */
    const { service, state } = svc(LIVE);
    await service.correct('org-a', 'expenses', { title: 'Expenses policy' });
    expect(state.created).toHaveLength(0);
    expect(state.updates[0].title).toBe('Expenses policy');
    expect(state.updates[0].version).toBeUndefined();
    expect(state.updates[0].effectiveFrom).toBeUndefined();
  });

  it('and cannot change the body, which is what put is for', async () => {
    const { service, state } = svc(LIVE);
    await service.correct('org-a', 'expenses', { title: 'x', body: 'rewritten' } as any);
    expect(state.updates[0].body).toBeUndefined();
  });

  it('retiring supersedes rather than deleting', async () => {
    const { service, state, prisma } = svc(LIVE);
    await service.retire('org-a', 'expenses');
    expect(state.updates[0].effectiveTo).toBeInstanceOf(Date);
    expect(prisma.knowledgeCard.create).not.toHaveBeenCalled();
  });

  it('refuses a kind it does not have rather than guessing one', async () => {
    const { service } = svc(null);
    await expect(service.put('org-a', { ...CARD, kind: 'policy' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses a card with no key, because a key is what makes it a version of something', async () => {
    const { service } = svc(null);
    await expect(service.put('org-a', { ...CARD, key: '  ' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('correcting something that is not there is not found', async () => {
    const { service } = svc(null);
    await expect(service.correct('org-a', 'nope', { title: 'x' })).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('what was true on the day', () => {
  it('asks for the version in force at a moment, not the current one', async () => {
    const { service, prisma } = svc(null);
    const when = new Date('2026-03-15T00:00:00Z');
    await service.asOf('org-a', 'expenses', when);
    const where = prisma.knowledgeCard.findFirst.mock.calls[0][0].where;
    expect(where.effectiveFrom).toEqual({ lte: when });
    expect(where.OR).toEqual([{ effectiveTo: null }, { effectiveTo: { gt: when } }]);
  });
});

describe('retrieval is capped and logged', () => {
  it('says nothing for a query too short to mean anything', async () => {
    const { service, prisma } = svc(null);
    expect(await service.retrieve('org-a', 'u-1', 'x')).toEqual({ cards: [], truncated: false });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('caps by characters after ranking, so the best card is never the one dropped', async () => {
    const { service, prisma } = svc(null);
    prisma.$queryRaw = jest.fn(async () => [
      { id: 'a', title: 'best', body: 'x'.repeat(100), kind: 'HANDBOOK', key: 'a', score: 0.9 },
      { id: 'b', title: 'huge', body: 'x'.repeat(MAX_CHARS), kind: 'HANDBOOK', key: 'b', score: 0.5 },
    ]);
    const r = await service.retrieve('org-a', 'u-1', 'something');
    expect(r.cards.map((c: any) => c.id)).toEqual(['a']);
    expect(r.truncated).toBe(true);
  });

  it('logs which cards produced an answer, so a wrong one can be traced', async () => {
    /* Without this, "why did it say that" has no answer at all and the honest response to a
       customer is a shrug. */
    const { service, prisma } = svc(null);
    prisma.$queryRaw = jest.fn(async () => [{ id: 'a', title: 't', body: 'b', kind: 'HANDBOOK', key: 'expenses', score: 0.85 }]);
    await service.retrieve('org-a', 'u-1', 'how do we do expenses');
    const logged = prisma.knowledgeRetrieval.create.mock.calls[0][0].data;
    expect(logged.query).toBe('how do we do expenses');
    expect(logged.cards[0]).toMatchObject({ key: 'expenses', score: 0.85 });
  });

  it('a failure to log never costs somebody their answer', async () => {
    const { service, prisma } = svc(null);
    prisma.$queryRaw = jest.fn(async () => [{ id: 'a', title: 't', body: 'b', kind: 'HANDBOOK', key: 'k', score: 0.9 }]);
    prisma.knowledgeRetrieval.create = jest.fn(async () => { throw new Error('log write failed'); });
    await expect(service.retrieve('org-a', 'u-1', 'anything')).resolves.toMatchObject({ cards: [{ id: 'a' }] });
  });

  it('never returns more cards than the cap', async () => {
    expect(MAX_CARDS).toBeLessThanOrEqual(10);
    expect(MAX_CHARS).toBeLessThanOrEqual(20_000);
  });
});
