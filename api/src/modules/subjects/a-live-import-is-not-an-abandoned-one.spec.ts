import { BulkImportService, HEARTBEAT_STALE_MS } from './bulk-import.service';

/**
 * TWO INSTANCES BOOTING, ONE IMPORT, BOTH RUNNING IT.
 *
 * `heartbeatAt` is written on every batch and its own schema comment says what it is for - "so a
 * job whose process died can be told from a slow one". Nothing read it. `resumeAbandoned` selected
 * every job in QUEUED or RUNNING and started it, so an instance booting while another was half way
 * through a ten thousand row import took that import over and both ran it. Idempotent upserts are
 * why this never looked like corruption, and why it could sit here unnoticed.
 *
 * Driven against Postgres, two instances racing, one dead job and one with a live heartbeat:
 *   before: dead started 1, LIVE started 1
 *   after:  dead started 1, LIVE started 0
 */
describe('a live import is not an abandoned one', () => {
  function svc(claimIds: string[], rows: any[] = [{ externalId: 's1' }]) {
    const started: string[] = [];
    const prisma: any = {
      $queryRaw: jest.fn(async () => claimIds.map(id => ({ id }))),
      importJob: {
        findMany: jest.fn(async () => claimIds.map(id => ({
          id, organizationId: 'org-a', sourceSystem: 'hr', payload: rows, cursor: 0, total: rows.length,
        }))),
        update: jest.fn(async () => ({})),
      },
    };
    const service = new BulkImportService(prisma, { push: jest.fn() } as any);
    (service as any).run = async (jobId: string) => { started.push(jobId); };
    return { service, prisma, started };
  }

  it('starts only what it claimed', async () => {
    const { service, started } = svc(['j1', 'j2']);
    const res = await service.resumeAbandoned();
    expect(res).toEqual({ resumed: 2 });
    expect(started).toEqual(['j1', 'j2']);
  });

  it('does nothing at all when another instance holds every job', async () => {
    const { service, prisma, started } = svc([]);
    const res = await service.resumeAbandoned();
    expect(res).toEqual({ resumed: 0 });
    expect(started).toEqual([]);
    /* And does not go on to read jobs it did not claim. */
    expect(prisma.importJob.findMany).not.toHaveBeenCalled();
  });

  it('asks the database for the time, not this process', async () => {
    /*
     * The same trap as the webhook claim. A JS Date bound as a raw parameter is converted using the
     * session timezone while Prisma writes UTC, so the first version compared a heartbeat one
     * second old against a threshold three hours out and declared a live job dead. Two writers on
     * one cursor is exactly what this method exists to prevent.
     */
    const { service, prisma } = svc([]);
    await service.resumeAbandoned();
    const sql = JSON.stringify(prisma.$queryRaw.mock.calls[0][0]);
    expect(sql).toContain("now() AT TIME ZONE 'UTC'");
    expect(sql).toContain('interval');
    expect(sql).toContain('SKIP LOCKED');
  });

  it('does not retry a payload it cannot read, and does not count it as resumed', async () => {
    const { service, prisma, started } = svc(['bad'], []);
    const res = await service.resumeAbandoned();
    expect(started).toEqual([]);
    expect(res).toEqual({ resumed: 0 });
    expect(prisma.importJob.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ state: 'ABANDONED' }) }),
    );
  });

  it('waits long enough that a slow job is never mistaken for a dead one', () => {
    /* The heartbeat is written every fifty rows; taking a merely slow job is the failure here. */
    expect(HEARTBEAT_STALE_MS).toBeGreaterThanOrEqual(5 * 60_000);
  });
});
