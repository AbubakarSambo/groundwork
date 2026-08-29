import { WebhooksService, LEASE_MS } from './webhooks.service';

/**
 * TWO SWEEPS, ONE DELIVERY, AND THE CUSTOMER GETS IT TWICE.
 *
 * `deliverDue` read the due rows and only wrote to them after the HTTP call came back. The cron
 * guards against overlap with a boolean on one process, so two API instances - or one restarted
 * mid-sweep - both selected the same rows and both sent.
 *
 * DRIVEN AGAINST REAL POSTGRES BEFORE AND AFTER, because these suites mock Prisma and a mock
 * returns its fixture whatever the query asked. Six deliveries, two concurrent sweeps, a receiver
 * counting hits:
 *
 *   before: sweep A attempted 6, sweep B attempted 6, 12 hits, every event twice
 *   after:  sweep A attempted 0, sweep B attempted 6, 6 hits, no event twice
 *
 * What is testable here is the ordering the fix depends on - that the claim is written before
 * anything is sent. The SQL itself is proved by running it.
 */
describe('a row selected is not a row claimed', () => {
  function svc(dueIds: string[]) {
    const order: string[] = [];
    const prisma: any = {
      $queryRaw: jest.fn(async () => { order.push('claim'); return dueIds.map(id => ({ id })); }),
      webhookDelivery: {
        findMany: jest.fn(async () => dueIds.map(id => ({
          id, eventId: `evt-${id}`, eventType: 't', payload: {}, attempts: 0, createdAt: new Date(),
          endpoint: { url: 'https://receiver.test/hook', secret: 's' },
        }))),
        update: jest.fn(async () => ({})),
      },
    };
    const service = new WebhooksService(prisma);
    return { service, prisma, order };
  }

  const okFetch = (order: string[]) => jest.fn(async () => {
    order.push('send');
    return { status: 200, text: async () => 'ok' } as any;
  });

  it('claims the rows before it sends any of them', async () => {
    const { service, order } = svc(['d1', 'd2']);
    (global as any).fetch = okFetch(order);

    const res = await service.deliverDue(new Date());

    expect(res).toEqual({ attempted: 2, delivered: 2 });
    /* The claim is first, and there is exactly one of it - not one per delivery. */
    expect(order[0]).toBe('claim');
    expect(order.filter(o => o === 'claim')).toHaveLength(1);
    expect(order.slice(1)).toEqual(['send', 'send']);
  });

  it('does no work at all when another sweep already holds the rows', async () => {
    const { service, prisma } = svc([]);
    (global as any).fetch = jest.fn(async () => { throw new Error('nothing should be sent'); });

    const res = await service.deliverDue(new Date());

    expect(res).toEqual({ attempted: 0, delivered: 0 });
    /* And it does not go on to read rows it did not claim. */
    expect(prisma.webhookDelivery.findMany).not.toHaveBeenCalled();
  });

  it('leases for longer than one attempt can take, so a live sweep never loses its rows', () => {
    /*
     * REQUEST_TIMEOUT_MS is the ceiling on a single send. A lease shorter than it would expire
     * under a sweep that is still working, and the row would be taken by the next sweep while the
     * first one was still holding the connection open - which is the duplicate, reintroduced.
     */
    const { REQUEST_TIMEOUT_MS } = require('./how-a-receiver-knows-it-was-us');
    expect(LEASE_MS).toBeGreaterThan(REQUEST_TIMEOUT_MS ?? 0);
  });
});
