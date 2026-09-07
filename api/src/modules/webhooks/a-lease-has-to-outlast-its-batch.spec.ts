/**
 * THREE WAYS A DELIVERY WENT TWICE, OR ITS HISTORY WENT AT ALL.
 *
 *  - the sweep claims up to fifty deliveries and sends them one at a time at ten seconds each,
 *    against a five-minute lease. Above thirty, the lease expired under a sweep that was still
 *    working and a second instance sent the tail again.
 *  - a replay set nextAttemptAt to NOW and then sent — which is the exact state the sweep claims
 *    rows in, so the two could send the same delivery at the same moment.
 *  - removing an endpoint hard-deleted it, and deliveries cascade off it, so it took the whole
 *    delivery log — the only record of what we sent and whether it arrived.
 */
import { NotFoundException } from '@nestjs/common';
import { WebhooksService, LEASE_MS, leaseForABatchOf } from './webhooks.service';

describe('a lease has to outlast its batch', () => {
  it('covers fifty sequential sends at ten seconds each', () => {
    /* The number the sweep actually uses. Eight minutes of work cannot sit under a five-minute
       claim, which is what the old constant did. */
    expect(leaseForABatchOf(50)).toBeGreaterThan(50 * 10_000);
  });

  it('never drops below the old floor for a small batch', () => {
    expect(leaseForABatchOf(1)).toBe(LEASE_MS);
    expect(leaseForABatchOf(5)).toBe(LEASE_MS);
  });

  it('grows with the limit, so raising it cannot reintroduce the fault', () => {
    expect(leaseForABatchOf(200)).toBeGreaterThan(leaseForABatchOf(50));
  });

  it('treats a nonsense limit as one rather than as none', () => {
    expect(leaseForABatchOf(0)).toBe(LEASE_MS);
    expect(leaseForABatchOf(-3)).toBe(LEASE_MS);
  });
});

describe('the sweep and the replay take the same kind of claim', () => {
  const src = require('fs')
    .readFileSync(require('path').join(__dirname, 'webhooks.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('the sweep leases for the batch it claimed, not a constant', () => {
    expect(src).toContain('leaseForABatchOf(limit)');
    expect(src).not.toMatch(/\$\{`\$\{LEASE_MS\} milliseconds`\}/);
  });

  it('the replay takes a lease before it sends, using the database clock', () => {
    const from = src.indexOf('async replay(');
    const body = src.slice(from, from + 1200);
    expect(body).toContain('leaseForABatchOf(1)');
    expect(body).toContain("now() AT TIME ZONE 'UTC'");
    /* And the lease is taken BEFORE the attempt, or it is not a lease. */
    expect(body.indexOf('leaseForABatchOf(1)')).toBeLessThan(body.indexOf('this.attempt('));
    expect(body).not.toMatch(/nextAttemptAt: new Date\(\)/);
  });
});

describe('removing an endpoint keeps its history', () => {
  function makeService() {
    const rows: any[] = [{ id: 'e1', organizationId: 'org1', url: 'https://x.test/h', active: true, removedAt: null }];
    const prisma: any = {
      webhookEndpoint: {
        updateMany: jest.fn(async (a: any) => {
          const hit = rows.filter((r) => r.organizationId === a.where.organizationId && r.id === a.where.id && r.removedAt === null);
          for (const r of hit) Object.assign(r, a.data);
          return { count: hit.length };
        }),
        findMany: jest.fn(async (a: any) => rows.filter((r) => r.organizationId === a.where.organizationId && (a.where.removedAt === null ? r.removedAt === null : true))),
        deleteMany: jest.fn(async () => { throw new Error('a hard delete cascades the delivery log away'); }),
      },
    };
    const quiet = { tell: async () => [] } as any;
    const mailer = { sendWebhookEndpointDying: async () => undefined, frontendUrlForLinks: () => 'http://x' } as any;
    return { service: new WebhooksService(prisma, quiet, mailer), rows, prisma };
  }

  it('does not delete the row', async () => {
    const { service, prisma, rows } = makeService();
    await service.remove('org1', 'e1');
    expect(prisma.webhookEndpoint.deleteMany).not.toHaveBeenCalled();
    expect(rows[0].removedAt).toBeInstanceOf(Date);
  });

  it('stops it receiving anything further', async () => {
    const { service, rows } = makeService();
    await service.remove('org1', 'e1');
    expect(rows[0].active).toBe(false);
  });

  it('and keeps it out of the list, so it cannot be switched back on', async () => {
    const { service } = makeService();
    await service.remove('org1', 'e1');
    expect(await service.list('org1')).toEqual([]);
  });

  it('still refuses another organisation, and refuses a second removal', async () => {
    const { service } = makeService();
    await expect(service.remove('org2', 'e1')).rejects.toBeInstanceOf(NotFoundException);
    await service.remove('org1', 'e1');
    await expect(service.remove('org1', 'e1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
