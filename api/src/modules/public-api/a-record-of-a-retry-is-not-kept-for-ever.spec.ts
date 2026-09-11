import { ApiWatchCron } from './api-watch.cron';
import { KEEP_RECORDS_HOURS } from './idempotency.service';

/**
 * A RECORD OF A RETRY IS NOT KEPT FOR EVER. The replay window is a day and nothing deleted the
 * rows behind it. Older than the keep period, a row can neither replay nor conflict, so it goes.
 */
describe('pruning idempotency records', () => {
  it('deletes rows older than the keep period and nothing younger', async () => {
    const prisma: any = { idempotencyRecord: { deleteMany: jest.fn(async () => ({ count: 3 })) } };
    const cron = new ApiWatchCron(prisma);
    const before = Date.now();
    await cron.pruneIdempotencyRecords();
    const cutoff: Date = prisma.idempotencyRecord.deleteMany.mock.calls[0][0].where.createdAt.lt;
    const ageHours = (before - cutoff.getTime()) / 3600_000;
    expect(ageHours).toBeGreaterThanOrEqual(KEEP_RECORDS_HOURS - 0.01);
    expect(ageHours).toBeLessThan(KEEP_RECORDS_HOURS + 0.01);
  });

  it('keeps for longer than it replays, so a replayable row is never pruned', () => {
    expect(KEEP_RECORDS_HOURS).toBeGreaterThan(24);
  });

  it('a failing prune is logged, not thrown', async () => {
    const prisma: any = { idempotencyRecord: { deleteMany: jest.fn(async () => { throw new Error('database went away'); }) } };
    await expect(new ApiWatchCron(prisma).pruneIdempotencyRecords()).resolves.toBeUndefined();
  });
});
