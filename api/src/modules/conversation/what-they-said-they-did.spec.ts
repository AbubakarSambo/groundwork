import { ConversationService } from './conversation.service';

/**
 * HEARING WHAT SOMEBODY SAYS THEY HAVE DONE.
 *
 * Progress only existed if somebody typed it into a form, so a person could describe two proposals
 * at length in their check-in and the record would still say nothing had been done.
 *
 * That made the report unfair, not just thin: the reading that "the agreed thing is not being done"
 * rests on nothing being recorded as done, so an empty progress list turned every passed date into
 * that reading - for somebody who had been getting on with it and saying so.
 */
const promises = [
  { id: 'o1', text: 'Get three proposals out' },
  { id: 'o2', text: 'Meet the Bayer team' },
];

const svc = (over: { progress?: any[]; open?: any[]; said?: string } = {}) => {
  const deliveries: any[] = [];
  const updates: any[] = [];
  const s = Object.create(ConversationService.prototype) as any;
  s.logger = { warn: () => {} };
  s.anthropic = { extract: async () => ({ progress: over.progress ?? [] }) };
  s.prisma = {
    personObjective: {
      findMany: async () => over.open ?? promises,
      update: async (a: any) => { updates.push({ id: a.where.id, ...a.data }); return {}; },
    },
    conversationTurn: { findMany: async () => [{ content: over.said ?? 'x'.repeat(200) }] },
    delivery: { create: async (a: any) => { deliveries.push(a.data); return {}; } },
  };
  return { s, deliveries, updates };
};

describe('what they said they did', () => {
  it('is written against the promise it is about', async () => {
    const { s, deliveries } = svc({ progress: [{ promise: 'Get three proposals out', whatTheyDid: 'Sent two of them' }] });
    await s.extractProgress('c1', 'ed', 'g1');
    expect(deliveries[0].objectiveId).toBe('o1');
    expect(deliveries[0].text).toBe('Sent two of them');
  });

  it('and does not mark the promise finished for partial progress', async () => {
    /* Two of three is progress. Marking it done would lose him the credit for the third. */
    const { s, updates } = svc({ progress: [{ promise: 'Get three proposals out', whatTheyDid: 'Sent two of them', finished: false }] });
    await s.extractProgress('c1', 'ed', 'g1');
    expect(updates).toHaveLength(0);
  });

  it('marks it met only when they plainly said it was done', async () => {
    const { s, updates } = svc({ progress: [{ promise: 'Meet the Bayer team', whatTheyDid: 'Met them on Tuesday', finished: true }] });
    await s.extractProgress('c1', 'ed', 'g1');
    expect(updates[0]).toMatchObject({ id: 'o2', status: 'MET' });
    expect(updates[0].statusChangedAt).toBeInstanceOf(Date);
  });
});

describe('what it refuses', () => {
  it('progress that matches no promise on the record', async () => {
    /* Filed against the wrong promise is worse than filed against nothing: it marks the wrong
       thing as moving and leaves the real one looking untouched. */
    const { s, deliveries } = svc({ progress: [{ promise: 'Something else entirely', whatTheyDid: 'Did a thing' }] });
    await s.extractProgress('c1', 'ed', 'g1');
    expect(deliveries).toHaveLength(0);
  });

  it('anything at all when they have no open promises', async () => {
    const { s, deliveries } = svc({ open: [], progress: [{ promise: 'x', whatTheyDid: 'y' }] });
    await s.extractProgress('c1', 'ed', 'g1');
    expect(deliveries).toHaveLength(0);
  });

  it('a check-in with barely anything in it', async () => {
    const { s, deliveries } = svc({ said: 'Fine thanks', progress: [{ promise: 'Get three proposals out', whatTheyDid: 'Sent two' }] });
    await s.extractProgress('c1', 'ed', 'g1');
    expect(deliveries).toHaveLength(0);
  });

  it('and an empty description of what they did', async () => {
    const { s, deliveries } = svc({ progress: [{ promise: 'Get three proposals out', whatTheyDid: '   ' }] });
    await s.extractProgress('c1', 'ed', 'g1');
    expect(deliveries).toHaveLength(0);
  });
});

describe('only what is still open', () => {
  it('never reopens or re-marks something already finished', async () => {
    /* The query asks for OPEN only, so a met promise is not in the list to match against. */
    const { s, deliveries } = svc({ open: [], progress: [{ promise: 'Get three proposals out', whatTheyDid: 'Sent two' }] });
    await s.extractProgress('c1', 'ed', 'g1');
    expect(deliveries).toHaveLength(0);
  });
});
