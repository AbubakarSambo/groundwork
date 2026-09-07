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
    /* The notifier and the mailer: a dead delivery has to reach a person now, and these tests are
    not about that — see `tellThemItIsDying`. Doubles that do nothing keep them honest. */
    const quiet = { tell: async () => [] } as any;
    const mailer = { sendWebhookEndpointDying: async () => undefined, frontendUrlForLinks: () => 'http://localhost:5173' } as any;
    const service = new WebhooksService(prisma, quiet, mailer);
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

  it('compares against the database clock, never a Date bound as a parameter', async () => {
    /*
     * MEASURED, NOT REASONED ABOUT. `next_attempt_at` is `timestamp without time zone`; Prisma
     * writes UTC into it and a JS Date passed as a raw parameter is converted using the session
     * timezone. Three hours apart on this machine:
     *
     *   js Date (UTC)            : 2026-08-29T18:09:23.686Z
     *   same Date as a parameter : 2026-08-29T21:09:23.686
     *   now() AT TIME ZONE 'UTC' : 2026-08-29T18:09:23.706
     *
     * The first version of the claim used the parameter, so it took every delivery scheduled up to
     * three hours ahead and sent it early. Driven against Postgres: a delivery due in thirty
     * minutes was sent immediately. It would have passed anywhere the server runs in UTC.
     */
    const { service, prisma } = svc([]);
    await service.deliverDue(new Date());

    const sql = JSON.stringify(prisma.$queryRaw.mock.calls[0][0]);
    expect(sql).toContain("now() AT TIME ZONE 'UTC'");
    /* The lease is an interval on that clock, not a timestamp this process worked out. */
    expect(sql).toContain('interval');
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
