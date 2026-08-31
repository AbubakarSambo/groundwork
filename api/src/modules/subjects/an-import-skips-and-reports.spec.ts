import { BulkImportService, MAX_BATCH } from './bulk-import.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

/**
 * "3,999 SUCCEEDED" WITH NO WAY TO FIND THE OTHER ONE IS WORSE THAN AN ERROR.
 *
 * It looks like it was handled. The customer has no way to know which row is missing, and the
 * absence surfaces weeks later as data that does not match - blamed on their integration.
 *
 * So the failure LIST is the deliverable, not the counts. Each entry names the position and the
 * external id, because either alone is not enough: a customer whose rows have no ids yet cannot use
 * the id, and one whose rows were reordered cannot use the position.
 */
function harness(opts: { failAt?: number[]; priorJobs?: number } = {}) {
  const jobs: any[] = [];
  const failures: any[] = [];
  const quiet: any[] = [];
  const pushed: any[] = [];

  const prisma: any = {
    importJob: {
      /* Copies out, like Prisma does. Returning the live object let the background run mutate a
         value the caller had already been handed - the response said RUNNING when the real server
         says QUEUED, which made the mock disagree with the thing it was standing in for. */
      create: jest.fn(async ({ data }: any) => { const j = { id: 'job1', ...data }; jobs.push(j); return { ...j }; }),
      update: jest.fn(async ({ data }: any) => { Object.assign(jobs[0], data); return { ...jobs[0] }; }),
      count: jest.fn(async () => opts.priorJobs ?? 0),
      findFirst: jest.fn(async ({ where }: any) =>
        jobs.find((j) => j.id === where.id && j.organizationId === where.organizationId)
          ? { ...jobs[0], failures } : null,
      ),
    },
    importJobFailure: { createMany: jest.fn(async ({ data }: any) => { failures.push(...data); return { count: data.length }; }) },
    detectionQuietPeriod: {
      create: jest.fn(async ({ data }: any) => { quiet.push(data); return data; }),
      findMany: jest.fn(async () => quiet),
    },
  };
  /* Its own counter, NOT `pushed.length` - that stops advancing at the first failure, so one
     configured bad row makes every row after it fail too. Caught by the count being wrong. */
  let seen = -1;
  const subjects: any = {
    push: jest.fn(async (org: string, row: any) => {
      seen += 1;
      if (opts.failAt?.includes(seen)) throw new BadRequestException(`row ${seen} is bad`);
      pushed.push(row);
      return row;
    }),
  };
  return { service: new BulkImportService(prisma, subjects), jobs, failures, quiet, pushed, prisma };
}

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ externalId: `E-${i}`, type: 'objective', title: `T${i}` }) as any);
const settle = () => new Promise((r) => setTimeout(r, 0));

describe('an import skips and reports', () => {
  it('one bad row does not stop the others', async () => {
    const { service, jobs, pushed } = harness({ failAt: [2] });
    await service.start('org1', 'their-tool', rows(5));
    await settle();
    expect(pushed).toHaveLength(4);
    expect(jobs[0].succeeded).toBe(4);
    expect(jobs[0].failed).toBe(1);
    expect(jobs[0].state).toBe('COMPLETED');
  });

  it('and the job COMPLETES - a skipped row is not a dead job', async () => {
    /* ABANDONED is for the job itself dying. Conflating them means a customer with one typo cannot
       tell it apart from an outage. */
    const { service, jobs } = harness({ failAt: [0, 1, 2] });
    await service.start('org1', 'their-tool', rows(3));
    await settle();
    expect(jobs[0].state).toBe('COMPLETED');
    expect(jobs[0].error).toBeUndefined();
  });

  it('names each failure by position AND external id, with a message worth reading', async () => {
    const { service, failures } = harness({ failAt: [1, 3] });
    await service.start('org1', 'their-tool', rows(5));
    await settle();
    expect(failures.map((f) => [f.index, f.externalId])).toEqual([[1, 'E-1'], [3, 'E-3']]);
    for (const f of failures) {
      expect(f.message).toMatch(/row \d is bad/);
      expect(f.message).not.toMatch(/at .*\.ts:\d+|Error:/);
    }
  });

  it('returns a job id immediately rather than making them wait for the work', async () => {
    const { service } = harness();
    await expect(service.start('org1', 'their-tool', rows(3))).resolves.toEqual({
      jobId: 'job1', state: 'QUEUED', total: 3,
    });
  });

  it('refuses an empty batch and one over the cap', async () => {
    const { service } = harness();
    await expect(service.start('org1', 't', [])).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.start('org1', 't', rows(MAX_BATCH + 1))).rejects.toBeInstanceOf(BadRequestException);
  });

  it("takes the batch's source system, not a row's", async () => {
    /* A mixed batch is almost certainly a client bug, and silently splitting it across two source
       systems would be very hard for them to unpick later. */
    const { service, pushed } = harness();
    await service.start('org1', 'batch-system', [{ externalId: 'E-0', type: 'objective', title: 'T', sourceSystem: 'something-else' } as any]);
    await settle();
    expect(pushed[0].sourceSystem).toBe('batch-system');
  });

  it('a job from another organisation is not found', async () => {
    /* Its failure messages carry that org's external ids and objective titles. */
    const { service } = harness();
    await service.start('org1', 't', rows(1));
    await settle();
    await expect(service.status('org2', 'job1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.status('org1', 'job1')).resolves.toMatchObject({ jobId: 'job1' });
  });

  it('the status carries every failure, not a sample', async () => {
    const { service } = harness({ failAt: [0, 1, 2, 3] });
    await service.start('org1', 't', rows(4));
    await settle();
    const s = await service.status('org1', 'job1');
    expect(s.failures).toHaveLength(4);
    expect(s.failed).toBe(4);
  });
});

describe('the quiet period is stamped at import time', () => {
  it("an org's first import starts one", async () => {
    const { service, quiet } = harness({ priorJobs: 0 });
    await service.start('org1', 't', rows(3));
    await settle();
    expect(quiet).toHaveLength(1);
    expect(quiet[0].reason).toBe('INITIAL_IMPORT');
    expect(quiet[0].subjectCount).toBe(3);
  });

  it('a later import large enough starts another', async () => {
    const { service, quiet } = harness({ priorJobs: 1 });
    await service.start('org1', 't', rows(60));
    await settle();
    expect(quiet[0].reason).toBe('BULK_IMPORT');
  });

  it('a later SMALL import starts nothing, or the product never speaks', async () => {
    const { service, quiet } = harness({ priorJobs: 1 });
    await service.start('org1', 't', rows(3));
    await settle();
    expect(quiet).toEqual([]);
  });

  it('an import where everything failed starts nothing', async () => {
    /*
     * Counted on what LANDED, not what was sent. A wholly broken sync that also silenced the
     * product for a fortnight would leave the customer with nothing imported and nothing telling
     * them so.
     */
    const { service, quiet } = harness({ priorJobs: 0, failAt: [0, 1, 2] });
    await service.start('org1', 't', rows(3));
    await settle();
    expect(quiet).toEqual([]);
  });

  it('is surfaced on the job, because during onboarding it answers "why am I seeing nothing"', async () => {
    const { service } = harness({ priorJobs: 0 });
    await service.start('org1', 't', rows(3));
    await settle();
    const s = await service.status('org1', 'job1');
    expect(s.detectionQuietUntil).toBeInstanceOf(Date);
  });
});
