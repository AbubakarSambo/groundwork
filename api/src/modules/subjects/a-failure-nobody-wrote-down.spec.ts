/**
 * A CRASH LOST EVERY FAILURE THE JOB HAD FOUND.
 *
 * Failures were held in an array and written only after the whole loop, so a deploy or a killed
 * process mid-import lost all of them — and the resumed job then recorded only the ones it found
 * after resuming. The customer's report of what did not import was quietly incomplete, which is
 * worse than absent: they fix the twelve rows they can see and never learn about the other ninety.
 */
import { BulkImportService } from './bulk-import.service';

function makeService(opts: { failEvery?: number; rows: number; throwAt?: number }) {
  const written: any[] = [];
  const jobUpdates: any[] = [];
  const prisma: any = {
    importJob: {
      update: jest.fn(async (a: any) => { jobUpdates.push(a.data); return {}; }),
      findUnique: jest.fn(async () => ({ succeeded: 0, failed: 0 })),
      /* The completion path stamps a quiet period, which reads the org's other jobs. Not what
         these tests are about, but a double that lacks it fails for the wrong reason. */
      count: jest.fn(async () => 0),
    },
    organization: { update: jest.fn(async () => ({})), findUnique: jest.fn(async () => null) },
    detectionQuietPeriod: { create: jest.fn(async () => ({})) },
    importJobFailure: { createMany: jest.fn(async (a: any) => { written.push(...a.data); return {}; }) },
  };
  let n = 0;
  const subjects: any = {
    push: jest.fn(async () => {
      n++;
      if (opts.throwAt && n === opts.throwAt) throw new Error('the process died');
      if (opts.failEvery && n % opts.failEvery === 0) throw new Error('externalId is required');
    }),
  };
  const service = new BulkImportService(prisma, subjects);
  return { service, written, jobUpdates, prisma };
}

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ externalId: `s${i}`, title: 'x' }));

describe('a failure nobody wrote down', () => {
  it('writes failures down as it goes, not only at the end', async () => {
    const { service, written } = makeService({ rows: 120, failEvery: 10 });
    /* Interrupted after the first flush: everything found before it must already be durable. */
    await (service as any).run('job1', 'o1', 'src', rows(120));
    expect(written.length).toBe(12);
    /* And in more than one write, which is what "as it goes" means. */
    expect(written.filter((w) => w.index < 50).length).toBeGreaterThan(0);
  });

  it('keeps what it wrote when the run dies part-way', async () => {
    const { service, written } = makeService({ rows: 120, failEvery: 10, throwAt: 75 });
    await (service as any).run('job1', 'o1', 'src', rows(120)).catch(() => undefined);
    /* The first 50 rows produced five failures and they were flushed at the cursor step. Before
       this fix, a death at row 75 wrote none of them. */
    expect(written.length).toBeGreaterThanOrEqual(5);
  });

  it('does not write the same failure twice across flushes', async () => {
    const { service, written } = makeService({ rows: 120, failEvery: 10 });
    await (service as any).run('job1', 'o1', 'src', rows(120));
    const indexes = written.map((w) => w.index);
    expect(new Set(indexes).size).toBe(indexes.length);
  });

  it('carries a running failed count onto the job at every step, not just at completion', async () => {
    const { service, jobUpdates } = makeService({ rows: 120, failEvery: 10 });
    await (service as any).run('job1', 'o1', 'src', rows(120));
    const midway = jobUpdates.filter((u) => u.cursor === 50 || u.cursor === 100);
    expect(midway.length).toBe(2);
    for (const u of midway) expect(typeof u.failed).toBe('number');
  });

  it('records nothing when nothing failed', async () => {
    const { service, written } = makeService({ rows: 20 });
    await (service as any).run('job1', 'o1', 'src', rows(20));
    expect(written).toEqual([]);
  });
});
