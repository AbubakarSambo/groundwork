import { WebhooksService } from './webhooks.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

/**
 * THE DELIVERY LOG IS NOT DIAGNOSTICS FOR US.
 *
 * It is what a customer opens when their system did not do what they expected, and the question is
 * always the same one: did you send it, and what did we say back. So the response code and body are
 * recorded on success as well as failure, and a dead letter stays in the table - a dead letter
 * nobody can see is a lost message with extra steps.
 */
function svc(rows: { endpoints?: any[]; deliveries?: any[] } = {}) {
  const endpoints = rows.endpoints ?? [];
  const deliveries = rows.deliveries ?? [];
  const prisma: any = {
    webhookEndpoint: {
      create: jest.fn(async ({ data }: any) => { const e = { id: 'ep1', ...data }; endpoints.push(e); return e; }),
      /* HONOURS `select`, because Prisma does. Ignoring it made the fake return the signing secret
         from a list the real endpoint has never included it in - so the test failed on a bug that
         was only in the mock, while the server was already right. Verified against the running
         endpoint, which returns id, url, events, active, createdAt, rotatedAt and nothing else. */
      findMany: jest.fn(async ({ where, select }: any) => {
        const rows = endpoints.filter((e) => e.organizationId === where.organizationId
          && (where.active === undefined || e.active === where.active)
          && (!where.events?.has || e.events.includes(where.events.has)));
        if (!select) return rows;
        return rows.map((r) => Object.fromEntries(Object.keys(select).filter((k) => select[k]).map((k) => [k, r[k]])));
      }),
      findFirst: jest.fn(async ({ where }: any) => endpoints.find((e) => e.id === where.id && e.organizationId === where.organizationId) ?? null),
      update: jest.fn(async ({ where, data }: any) => { const e = endpoints.find((x) => x.id === where.id); Object.assign(e, data); return { ...e }; }),
      deleteMany: jest.fn(async ({ where }: any) => {
        const before = endpoints.length;
        for (let i = endpoints.length - 1; i >= 0; i--) {
          if (endpoints[i].id === where.id && endpoints[i].organizationId === where.organizationId) endpoints.splice(i, 1);
        }
        return { count: before - endpoints.length };
      }),
    },
    webhookDelivery: {
      createMany: jest.fn(async ({ data }: any) => { deliveries.push(...data); return { count: data.length }; }),
      findMany: jest.fn(async () => deliveries),
      findFirst: jest.fn(async ({ where }: any) => deliveries.find((d) => d.id === where.id && d.organizationId === where.organizationId) ?? null),
      update: jest.fn(async ({ data }: any) => data),
    },
  };
  return { service: new WebhooksService(prisma), endpoints, deliveries, prisma };
}

describe('registering an endpoint', () => {
  it('refuses plain http to a named host', async () => {
    /* The payload names the organisation and how many people were in a round. Over plaintext that
       is readable by anything on the path, and a console warning is not read before shipping. */
    const { service } = svc();
    await expect(service.register('org1', 'http://hooks.example.com/x', ['round.completed']))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows loopback over http, and nothing else', async () => {
    const { service } = svc();
    await expect(service.register('org1', 'http://localhost:9099/hook', ['round.completed'])).resolves.toBeTruthy();
    await expect(service.register('org1', 'http://127.0.0.1:9099/hook', ['round.completed'])).resolves.toBeTruthy();
    /* A hostname that happens to resolve to loopback today gets no exception - we cannot tell from
       a name where it will resolve on the day. */
    await expect(service.register('org1', 'http://local.test/hook', ['round.completed']))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns the signing secret exactly once, and never in the list', async () => {
    const { service } = svc();
    const made = await service.register('org1', 'https://x.test/h', ['round.completed']);
    expect(made.secret).toMatch(/^gwh_/);
    const listed = await service.list('org1');
    expect(JSON.stringify(listed)).not.toContain(made.secret);
  });

  it('rotation keeps the previous secret working, so nobody has a gap', async () => {
    /* Without the grace window, rotating means a period where every delivery fails verification -
       which is why nobody rotates, which is why a leaked secret stays live. */
    const { service, endpoints } = svc();
    const made = await service.register('org1', 'https://x.test/h', ['round.completed']);
    const rotated = await service.rotateSecret('org1', endpoints[0].id);
    expect(rotated.secret).not.toBe(made.secret);
    expect(endpoints[0].previousSecret).toBe(made.secret);
    expect(endpoints[0].rotatedAt).toBeInstanceOf(Date);
  });

  it("another organisation's endpoint cannot be rotated or removed", async () => {
    const { service, endpoints } = svc();
    await service.register('org1', 'https://x.test/h', ['round.completed']);
    await expect(service.rotateSecret('org2', endpoints[0].id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('org2', endpoints[0].id)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('emitting', () => {
  it('queues one delivery per subscribed endpoint, sharing one event id', async () => {
    /* Two endpoints receiving the same event are looking at ONE occurrence. A customer whose
       staging and production both listen should not see two. */
    const { service, deliveries } = svc({
      endpoints: [
        { id: 'a', organizationId: 'org1', active: true, events: ['round.completed'] },
        { id: 'b', organizationId: 'org1', active: true, events: ['round.completed'] },
      ],
    });
    const r = await service.emit('org1', 'round.completed', { roundNumber: 1 });
    expect(r.queued).toBe(2);
    expect(new Set(deliveries.map((d) => d.eventId)).size).toBe(1);
  });

  it('sends nothing to an endpoint that did not ask for that event', async () => {
    const { service } = svc({
      endpoints: [{ id: 'a', organizationId: 'org1', active: true, events: ['checkin.completed'] }],
    });
    expect((await service.emit('org1', 'round.completed', {})).queued).toBe(0);
  });

  it('refuses to emit an event type the product does not have', async () => {
    /* A programming error on our side, and it must not reach a customer as a message they cannot
       interpret. */
    const { service, deliveries } = svc({
      endpoints: [{ id: 'a', organizationId: 'org1', active: true, events: ['round.completed'] }],
    });
    expect((await service.emit('org1', 'blocker.raised', {})).queued).toBe(0);
    expect(deliveries).toHaveLength(0);
  });

  it('never crosses an organisation', async () => {
    const { service } = svc({
      endpoints: [{ id: 'a', organizationId: 'org2', active: true, events: ['round.completed'] }],
    });
    expect((await service.emit('org1', 'round.completed', {})).queued).toBe(0);
  });

  it('skips an endpoint that has been switched off', async () => {
    const { service } = svc({
      endpoints: [{ id: 'a', organizationId: 'org1', active: false, events: ['round.completed'] }],
    });
    expect((await service.emit('org1', 'round.completed', {})).queued).toBe(0);
  });
});

describe('replay', () => {
  it("is refused for another organisation's delivery", async () => {
    const { service } = svc({ deliveries: [{ id: 'd1', organizationId: 'org1' }] });
    await expect(service.replay('org2', 'd1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
