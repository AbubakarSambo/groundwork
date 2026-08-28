import { BulkImportService, MAX_BATCH, MAX_BATCH_BYTES } from './bulk-import.service';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE ROWS OUTLIVE THE PROCESS, OR THE JOB WAS NEVER SAFE.
 *
 * The work used to run from the request body held in memory. A deploy mid-import left the job
 * RUNNING forever and the remaining rows GONE - not failed, not retryable, gone, because the only
 * copy lived in a process that no longer existed. Meanwhile the customer's system held a 200 saying
 * the import had started, so nothing anywhere reported a problem.
 *
 * Proved against a real process kill: 5,000 rows, killed at row 1,050, restarted, resumed from
 * 1,050, finished all 5,000. These pin the behaviour that made that work.
 */
function harness(opts: { jobs?: any[]; failAt?: number[] } = {}) {
  const jobs = opts.jobs ?? [];
  const pushed: any[] = [];
  let seen = -1;
  const prisma: any = {
    importJob: {
      create: jest.fn(async ({ data }: any) => { const j = { id: 'job1', ...data }; jobs.push(j); return { ...j }; }),
      update: jest.fn(async ({ where, data }: any) => {
        const j = jobs.find((x) => x.id === where.id) ?? jobs[0];
        Object.assign(j, data);
        return { ...j };
      }),
      findUnique: jest.fn(async ({ where }: any) => jobs.find((j) => j.id === where.id) ?? null),
      findMany: jest.fn(async ({ where }: any) => {
        const states = where?.state?.in;
        return jobs.filter((j) => (!states || states.includes(j.state)) && (!where?.payload || j.payload != null));
      }),
      count: jest.fn(async () => 0),
    },
    importJobFailure: { createMany: jest.fn(async () => ({ count: 0 })) },
    detectionQuietPeriod: { create: jest.fn(async () => ({})), findMany: jest.fn(async () => []) },
  };
  const subjects: any = {
    push: jest.fn(async (_o: string, row: any) => {
      seen += 1;
      if (opts.failAt?.includes(seen)) throw new Error('bad row');
      pushed.push(row);
      return row;
    }),
  };
  return { service: new BulkImportService(prisma, subjects), jobs, pushed, prisma };
}

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ externalId: `E-${i}`, type: 'objective', title: `T${i}` }) as any);
const settle = () => new Promise((r) => setTimeout(r, 0));

describe('the rows are stored with the job', () => {
  it('so the work does not depend on this process surviving', async () => {
    const { service, jobs } = harness();
    await service.start('org1', 'sys', rows(3));
    expect(jobs[0].payload).toHaveLength(3);
  });

  it('and are dropped once the job can no longer need them', async () => {
    /* Otherwise this table becomes an archive of every batch anybody ever sent. */
    const { service, jobs } = harness();
    await service.start('org1', 'sys', rows(3));
    await settle();
    expect(jobs[0].state).toBe('COMPLETED');
    expect(jobs[0].payload).toBeDefined();
    expect(jobs[0].payload).not.toEqual(expect.any(Array));
  });
});

describe('a restart resumes rather than restarting', () => {
  it('picks up at the cursor, not at zero', async () => {
    const { service, pushed } = harness({
      jobs: [{ id: 'job1', organizationId: 'org1', sourceSystem: 'sys', state: 'RUNNING', total: 10, succeeded: 6, cursor: 6, payload: rows(10) }],
    });
    await service.resumeAbandoned();
    await settle();
    expect(pushed.map((r) => r.externalId)).toEqual(['E-6', 'E-7', 'E-8', 'E-9']);
  });

  it('keeps the count it had already earned', async () => {
    /* Starting the tally from zero would report four stored where ten are, and the number a
       customer reads would be smaller than the number of rows actually in their account. */
    const { service, jobs } = harness({
      jobs: [{ id: 'job1', organizationId: 'org1', sourceSystem: 'sys', state: 'RUNNING', total: 10, succeeded: 6, cursor: 6, payload: rows(10) }],
    });
    await service.resumeAbandoned();
    await settle();
    expect(jobs[0].succeeded).toBe(10);
  });

  it('leaves a finished job alone, because a finished job has no rows', async () => {
    /*
     * The test is "is there work here", not a heartbeat timeout. A timeout would guess at whether a
     * process is slow or dead; the payload answers it exactly.
     */
    const { service, pushed } = harness({
      jobs: [{ id: 'job1', organizationId: 'org1', sourceSystem: 'sys', state: 'COMPLETED', total: 3, succeeded: 3, cursor: 3, payload: null }],
    });
    expect(await service.resumeAbandoned()).toEqual({ resumed: 0 });
    expect(pushed).toEqual([]);
  });

  it('does not retry a batch it cannot read, forever', async () => {
    const { service, jobs } = harness({
      jobs: [{ id: 'job1', organizationId: 'org1', sourceSystem: 'sys', state: 'RUNNING', total: 3, cursor: 0, payload: { not: 'an array' } }],
    });
    await service.resumeAbandoned();
    expect(jobs[0].state).toBe('ABANDONED');
    expect(jobs[0].error).toMatch(/could not be read/i);
  });

  it('resuming is safe to do twice, because every row is an upsert', async () => {
    /* Which is also why the cursor moves in steps rather than per row: a handful of repeated
       upserts costs nothing, and halving the writes does. */
    const { service, pushed } = harness({
      jobs: [{ id: 'job1', organizationId: 'org1', sourceSystem: 'sys', state: 'RUNNING', total: 4, succeeded: 2, cursor: 2, payload: rows(4) }],
    });
    await service.resumeAbandoned();
    await settle();
    expect(pushed).toHaveLength(2);
  });
});

describe('the size limit and the row limit agree', () => {
  it('a documented batch size the body parser would refuse is not a cap, it is a lie', () => {
    /*
     * MAX_BATCH said five thousand while Express refused anything over its 100kb default - so a
     * plain three-thousand-row import came back "request entity too large". Found by sending one.
     */
    const MAIN = readFileSync(join(__dirname, '../../main.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(MAIN).toMatch(/useBodyParser\('json', \{ limit: MAX_BATCH_BYTES \}\)/);
  });

  it('leaves room for a rich row rather than a minimal one', () => {
    /* A subject with a measure, a target and a dozen contributors runs to about a kilobyte. */
    expect(MAX_BATCH_BYTES / MAX_BATCH).toBeGreaterThan(1024);
  });

  it('never mounts a body parser with app.use, which breaks every route', () => {
    /*
     * THIS GUARD FAILED ON ITS OWN FIX, WHICH IS THE POINT OF HAVING IT.
     *
     * The first version scoped a bigger limit to the bulk route with `app.use(path, json())`. That
     * broke request body parsing for EVERY route - mounting a parser that way stops Nest
     * registering its own - so logging in started failing with a validation error saying the email
     * was empty. It typechecked, it booted cleanly, and no test here touches a real HTTP body.
     * Found by trying to log in.
     */
    /* Comments stripped first: the prose above NAMES the bad pattern, and a scanner that counted
       it would fail on the explanation of the fix. The same trap this repo has a guard for, in
       reverse - see a-guard-that-a-comment-satisfies-is-not-a-guard.spec.ts. */
    const MAIN = readFileSync(join(__dirname, '../../main.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(MAIN).not.toMatch(/app\.use\([^)]*json\(/);
  });
});
