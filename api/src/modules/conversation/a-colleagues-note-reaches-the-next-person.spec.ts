import { ConversationContextService } from './context.service';

/**
 * THE READ PATH, DRIVEN RATHER THAN ASSERTED FROM SOURCE.
 *
 * The lookup is deliberately fail-soft - a check-in must never break because a colleague's note
 * could not be fetched - and fail-soft is exactly how a feature ends up never running while every
 * test stays green. So this drives it with a stub that works, and one that does not.
 */
const svc = (over: { offers?: any[]; explodes?: boolean } = {}) => {
  const s: any = Object.create(ConversationContextService.prototype);
  s.prisma = {
    groundParticipant: { findUnique: async () => ({ specificityHistory: [] }), update: async () => ({}) },
    ground: {
      findUnique: async () => {
        if (over.explodes) throw new Error('database is having a day');
        return { organizationId: 'org1' };
      },
    },
    whatWorked: { findMany: async () => over.offers ?? [] },
  };
  return s;
};

const offer = (over: any = {}) => ({
  byName: 'Amaka',
  about: 'procurement hold on the council contract',
  what: 'I asked their finance team for the PO number directly instead of chasing the buyer.',
  offeredAt: new Date('2026-08-01'),
  ...over,
});

describe('a colleague\'s note reaches whoever hits the same thing next', () => {
  it('reaches somebody describing the same problem', async () => {
    const out = await svc({ offers: [offer()] })
      .whatOthersWorkedOut('g1', 'p2', 'I am stuck on a procurement hold at the council again');
    expect(out).toHaveLength(1);
    expect(out[0].by).toBe('Amaka');
    expect(out[0].what).toContain('PO number');
  });

  it('does not reach somebody with a different problem', async () => {
    const out = await svc({ offers: [offer()] })
      .whatOthersWorkedOut('g1', 'p2', 'the demo environment keeps timing out');
    expect(out).toEqual([]);
  });

  it('never hands somebody their own note back, which reads as not listening', async () => {
    /* Asserted on the query rather than the result, because filtering after the fact would still
       have fetched it - and the point is that the reader's own words never come back at them. */
    const s = svc({ offers: [offer()] });
    let asked: any = null;
    s.prisma.whatWorked.findMany = async (args: any) => { asked = args; return [offer()]; };
    await s.whatOthersWorkedOut('g1', 'p2', 'procurement hold at the council');
    expect(asked.where.byParticipantId).toEqual({ not: 'p2' });
  });

  it('stays inside the organisation', async () => {
    const s = svc({ offers: [offer()] });
    let asked: any = null;
    s.prisma.whatWorked.findMany = async (args: any) => { asked = args; return []; };
    await s.whatOthersWorkedOut('g1', 'p2', 'procurement hold at the council');
    expect(asked.where.organizationId).toBe('org1');
  });

  it('gives at most two, because a wall of colleagues is not help', async () => {
    const many = Array.from({ length: 6 }, (_, i) => offer({ byName: `Person ${i}`, offeredAt: new Date(2026, 1, i + 1) }));
    const out = await svc({ offers: many }).whatOthersWorkedOut('g1', 'p2', 'procurement hold at the council');
    expect(out).toHaveLength(2);
  });

  it('costs nobody their check-in when the lookup fails', async () => {
    const out = await svc({ explodes: true }).whatOthersWorkedOut('g1', 'p2', 'procurement hold at the council');
    expect(out).toEqual([]);
  });
});
